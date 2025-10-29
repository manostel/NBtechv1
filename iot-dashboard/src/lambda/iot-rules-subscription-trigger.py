import json
import boto3
import logging
from datetime import datetime, timezone, timedelta
from boto3.dynamodb.conditions import Key
from decimal import Decimal

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS services
dynamodb = boto3.resource('dynamodb')
subscriptions_table = dynamodb.Table('IoT_DeviceSubscriptions')
notifications_table = dynamodb.Table('IoT_SubscriptionNotifications')

def lambda_handler(event, context):
    """
    This Lambda function is triggered by AWS IoT Core Rules Engine
    when device data messages arrive. It checks for subscription triggers
    and sends notifications immediately.
    
    The IoT Rule should be configured to trigger on topics like:
    NBtechv1/+/data/+
    """
    try:
        logger.info("=" * 80)
        logger.info("IoT Rules triggered - Full event structure:")
        logger.info(json.dumps(event, default=str, indent=2))
        logger.info("=" * 80)
        
        # Extract topic and log it
        topic = event.get('topic', '')
        logger.info(f"Topic received: {topic}")
        
        # Extract device information from IoT Core event
        device_id = extract_device_id(event)
        device_data = extract_device_data(event)
        
        logger.info(f"Extracted device_id: {device_id}")
        logger.info(f"Extracted device_data keys: {list(device_data.keys()) if device_data and isinstance(device_data, dict) else 'None or not dict'}")
        
        if not device_id:
            logger.error("No valid device ID found in event")
            logger.error(f"Event keys: {list(event.keys())}")
            return {'statusCode': 400, 'body': 'Invalid event data: No device ID'}
        
        if not device_data:
            logger.error("No valid device data found in event")
            logger.error(f"Event keys: {list(event.keys())}")
            return {'statusCode': 400, 'body': 'Invalid event data: No device data'}
        
        # Determine message type (data or command)
        # Topics can be: 
        # - NBtechv1/{device_id}/data (main data topic)
        # - NBtechv1/{device_id}/data/+ (with subtopic like metrics, status)
        # - NBtechv1/{device_id}/cmd (command topic)
        if topic.startswith('NBtechv1/') and '/data' in topic:
            message_type = 'data'
        elif topic.startswith('NBtechv1/') and '/cmd' in topic:
            message_type = 'command'
        else:
            message_type = 'unknown'
            
        logger.info(f"Processing {message_type} message for device: {device_id}")
        logger.info(f"Full topic path: {topic}")
        
        # Check for subscription triggers (synchronous version)
        triggered_count = check_and_trigger_subscriptions_sync(device_id, device_data, message_type)
        
        logger.info(f"Triggered {triggered_count} subscriptions for device {device_id}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Subscription check completed',
                'device_id': device_id,
                'triggered_count': triggered_count
            })
        }
        
    except Exception as e:
        logger.error(f"Error processing IoT Rules event: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def extract_device_id(event):
    """Extract device ID from IoT Core event"""
    try:
        # IoT Core Rules Engine provides topic information
        # Topic format: NBtechv1/{device_id}/data/... or NBtechv1/{device_id}/cmd/...
        if 'topic' in event:
            topic_parts = event['topic'].split('/')
            if len(topic_parts) >= 2:
                device_id = topic_parts[1]
                logger.info(f"Extracted device_id from topic: {device_id}")
                return device_id
        
        # Alternative: extract from payload (if base64 encoded)
        if 'payload' in event:
            try:
                # Try to decode base64 first
                import base64
                payload_str = base64.b64decode(event['payload']).decode('utf-8')
                payload = json.loads(payload_str)
                return payload.get('client_id')
            except:
                # If not base64, try direct JSON
                try:
                    payload = json.loads(event['payload'])
                    return payload.get('client_id')
                except:
                    pass
        
        # Alternative: extract from event itself (SELECT * puts fields directly in event)
        if 'client_id' in event:
            logger.info(f"Extracted device_id from event.client_id: {event['client_id']}")
            return event['client_id']
            
        logger.warning(f"Could not extract device_id from event. Available keys: {list(event.keys())}")
        return None
    except Exception as e:
        logger.error(f"Error extracting device ID: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return None

def extract_device_data(event):
    """Extract device data from IoT Core event"""
    try:
        # IoT Core Rules Engine provides the message payload
        # With SELECT *, data might be:
        # 1. In 'payload' field (base64 encoded or JSON string)
        # 2. Directly in the event object (SELECT * puts all fields in event)
        # 3. In 'data' field
        
        # Check if payload exists and try to parse it
        if 'payload' in event:
            try:
                # Try base64 decode first
                import base64
                payload_str = base64.b64decode(event['payload']).decode('utf-8')
                payload = json.loads(payload_str)
                logger.info(f"Extracted data from base64-encoded payload. Keys: {list(payload.keys())}")
                return payload
            except:
                # If not base64, try direct JSON
                try:
                    payload = json.loads(event['payload'])
                    logger.info(f"Extracted data from JSON payload. Keys: {list(payload.keys())}")
                    return payload
                except:
                    pass
        
        # Check if data exists directly
        if 'data' in event:
            logger.info(f"Extracted data from event.data. Keys: {list(event['data'].keys()) if isinstance(event['data'], dict) else 'not a dict'}")
            return event['data']
        
        # With SELECT *, all fields are directly in the event
        # Exclude metadata fields that shouldn't be part of device data
        metadata_fields = {'topic', 'timestamp', 'messageId', 'ruleName', 'ruleArn'}
        device_data = {k: v for k, v in event.items() if k not in metadata_fields and k != 'payload'}
        
        # If we have device data fields, return them
        if device_data:
            logger.info(f"Extracted data from event fields (SELECT *). Keys: {list(device_data.keys())}")
            return device_data
            
        # Fallback: return entire event
        logger.warning(f"Could not extract device data. Returning full event. Keys: {list(event.keys())}")
        return event
    except Exception as e:
        logger.error(f"Error extracting device data: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return None

def check_and_trigger_subscriptions_sync(device_id, device_data, message_type):
    """Check and trigger subscriptions for a device (synchronous version)"""
    try:
        # Get all active subscriptions for this device
        subscriptions = get_device_subscriptions_sync(device_id)
        
        if not subscriptions:
            logger.info(f"No active subscriptions for device {device_id}")
            return 0
        
        triggered_count = 0
        
        # Check each subscription
        for subscription in subscriptions:
            # Loop prevention: Skip subscriptions if this is a command message
            # (which means it was triggered by another subscription)
            if message_type == 'command':
                logger.info(f"Skipping subscription {subscription['subscription_id']} - command message detected (loop prevention)")
                continue
                
            # Only check subscriptions that match the message type
            if check_single_subscription_sync(subscription, device_data, message_type):
                # Execute command actions if any
                if subscription.get('commands'):
                    execute_multiple_commands_sync(subscription)
                
                trigger_subscription_notification_sync(subscription, device_data, message_type)
                triggered_count += 1
        
        return triggered_count
        
    except Exception as e:
        logger.error(f"Error checking subscriptions for {device_id}: {e}")
        return 0

async def check_and_trigger_subscriptions(device_id, device_data, message_type):
    """Check and trigger subscriptions for a device"""
    try:
        # Get all active subscriptions for this device
        subscriptions = await get_device_subscriptions(device_id)
        
        if not subscriptions:
            logger.info(f"No active subscriptions for device {device_id}")
            return 0
        
        triggered_count = 0
        
        # Check each subscription
        for subscription in subscriptions:
            # Only check subscriptions that match the message type
            if await check_single_subscription(subscription, device_data, message_type):
                await trigger_subscription_notification(subscription, device_data, message_type)
                triggered_count += 1
        
        return triggered_count
        
    except Exception as e:
        logger.error(f"Error checking subscriptions for {device_id}: {e}")
        return 0

def get_device_subscriptions_sync(device_id):
    """Get all active subscriptions for a device (synchronous version)"""
    try:
        logger.info(f"Looking for subscriptions for device_id: {device_id}")
        
        response = subscriptions_table.scan(
            FilterExpression='device_id = :device_id AND enabled = :enabled',
            ExpressionAttributeValues={
                ':device_id': device_id,
                ':enabled': True
            }
        )
        
        subscriptions = response.get('Items', [])
        logger.info(f"Found {len(subscriptions)} active subscription(s) for device {device_id}")
        
        if subscriptions:
            for sub in subscriptions:
                logger.info(f"  - Subscription ID: {sub.get('subscription_id')}, Parameter: {sub.get('parameter_name')}, Condition: {sub.get('condition_type')}")
        
        return subscriptions
        
    except Exception as e:
        logger.error(f"Error getting subscriptions for {device_id}: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return []

async def get_device_subscriptions(device_id):
    """Get all active subscriptions for a device"""
    try:
        response = subscriptions_table.scan(
            FilterExpression='device_id = :device_id AND enabled = :enabled',
            ExpressionAttributeValues={
                ':device_id': device_id,
                ':enabled': True
            }
        )
        
        return response.get('Items', [])
        
    except Exception as e:
        logger.error(f"Error getting subscriptions for {device_id}: {e}")
        return []

def extract_parameter_value(device_data, parameter_name):
    """Extract parameter value from device data, handling nested and direct parameters"""
    try:
        # Handle nested parameters like outputs.OUT1
        if '.' in parameter_name:
            # Extract nested value: outputs.OUT1 -> device_data['outputs']['OUT1']
            parts = parameter_name.split('.')
            current_value = device_data
            for part in parts:
                if isinstance(current_value, dict):
                    current_value = current_value.get(part)
                else:
                    current_value = None
                    break
            return current_value
        else:
            # Handle direct parameters
            return device_data.get(parameter_name)
    except Exception as e:
        logger.error(f"Error extracting parameter {parameter_name}: {e}")
        return None

def normalize_value_for_comparison(value):
    """Normalize value for comparison (handle Decimal, float, int, str)"""
    if value is None:
        return None
    # Convert Decimal to float for comparison
    if isinstance(value, Decimal):
        return float(value)
    # Convert numeric strings to float
    if isinstance(value, str):
        try:
            return float(value)
        except (ValueError, TypeError):
            return value
    return value

def check_single_subscription_sync(subscription, device_data, message_type):
    """Check if a single subscription should trigger (synchronous version)"""
    try:
        parameter_name = subscription['parameter_name']
        subscription_id = subscription.get('subscription_id', 'unknown')
        device_id = subscription['device_id']
        
        logger.info(f"Checking subscription {subscription_id} for parameter: {parameter_name}, device: {device_id}")
        logger.info(f"Device data keys: {list(device_data.keys()) if isinstance(device_data, dict) else 'not a dict'}")
        
        # Extract parameter value
        current_value = extract_parameter_value(device_data, parameter_name)
        
        if current_value is None:
            logger.warning(f"Parameter {parameter_name} not found in device data")
            logger.info(f"Available keys in device_data: {list(device_data.keys()) if isinstance(device_data, dict) else 'not a dict'}")
            return False
        
        # Normalize value for comparison
        current_value_normalized = normalize_value_for_comparison(current_value)
        logger.info(f"Extracted value for {parameter_name}: {current_value} (normalized: {current_value_normalized})")
        
        # Get last known value
        last_value = get_last_parameter_value_sync(device_id, parameter_name)
        last_value_normalized = normalize_value_for_comparison(last_value)
        
        logger.info(f"Last value for {parameter_name}: {last_value} (normalized: {last_value_normalized})")
        
        # Check if value changed (using normalized values)
        # For numeric values, use 2% tolerance to only trigger on meaningful changes
        if last_value_normalized is None:
            has_changed = True
        elif isinstance(current_value_normalized, (int, float)) and isinstance(last_value_normalized, (int, float)):
            # Use 2% tolerance - only trigger if change is more than 2% of the current value
            # For very small values (< 1), use minimum absolute change of 0.01
            tolerance = max(abs(current_value_normalized) * 0.02, 0.01)
            has_changed = abs(current_value_normalized - last_value_normalized) > tolerance
        else:
            # For non-numeric values, use exact comparison
            has_changed = current_value_normalized != last_value_normalized
        
        if not has_changed:
            logger.info(f"Parameter {parameter_name} value unchanged ({current_value_normalized}) - skipping trigger")
            return False
        
        # Evaluate subscription condition
        condition_type = subscription['condition_type']
        threshold_value = subscription.get('threshold_value')
        # Handle empty string, None, or actual value
        threshold_normalized = None
        if threshold_value is not None and threshold_value != '':
            threshold_normalized = normalize_value_for_comparison(threshold_value)
        
        should_trigger = evaluate_subscription_condition(
            condition_type,
            current_value_normalized,
            threshold_normalized
        )
        
        logger.info(f"Condition check: {condition_type}, current={current_value_normalized}, threshold={threshold_normalized}, should_trigger={should_trigger}")
        
        if should_trigger:
            # For "change" condition, store the new value FIRST to prevent retriggering on same value
            # even if we skip due to cooldown or other checks
            if condition_type == 'change':
                store_parameter_value_sync(device_id, parameter_name, current_value_normalized)
                logger.info(f"Stored new value for 'change' condition: {current_value_normalized}")
            
            # Enhanced loop prevention: Check cooldown period
            if not check_subscription_cooldown_sync(subscription):
                logger.info(f"Subscription {subscription_id} in cooldown period - skipping")
                # Value already stored for "change" condition, so it won't retrigger
                return False
            
            # Enhanced loop prevention: Check for self-triggering commands
            if check_self_triggering_loop_sync(subscription, device_data):
                logger.warning(f"Subscription {subscription_id} would create self-triggering loop - skipping")
                # Value already stored for "change" condition, so it won't retrigger
                return False
            
            # Enhanced loop prevention: Validate command targets
            if not validate_command_targets_sync(subscription):
                logger.warning(f"Subscription {subscription_id} has invalid command targets - skipping")
                # Value already stored for "change" condition, so it won't retrigger
                return False
            
            logger.info(f"✅ Subscription {subscription_id} conditions met - triggering!")
            
            # Update subscription trigger info
            update_subscription_trigger_sync(subscription_id)
            
            # Store new value for future comparison (for non-"change" conditions)
            if condition_type != 'change':
                store_parameter_value_sync(device_id, parameter_name, current_value_normalized)
            
            return True
        
        # If condition not met, still store the value to track the last value properly
        # This prevents false "change" triggers when value goes back to previous value
        store_parameter_value_sync(device_id, parameter_name, current_value_normalized)
        
        return False
        
    except Exception as e:
        logger.error(f"Error checking subscription {subscription.get('subscription_id', 'unknown')}: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False

async def check_single_subscription(subscription, device_data, message_type):
    """Check if a single subscription should trigger"""
    try:
        parameter_name = subscription['parameter_name']
        
        # Handle nested parameters like outputs.OUT1
        if '.' in parameter_name:
            # Extract nested value: outputs.OUT1 -> device_data['outputs']['OUT1']
            parts = parameter_name.split('.')
            current_value = device_data
            for part in parts:
                if isinstance(current_value, dict):
                    current_value = current_value.get(part)
                else:
                    current_value = None
                    break
        else:
            # Handle direct parameters
            current_value = device_data.get(parameter_name)
        
        if current_value is None:
            return False
        
        # Check if subscription is for the right message type
        # Handle nested structure: outputs.OUT1, inputs.IN1, etc.
        data_parameters = ['temperature', 'humidity', 'battery', 'signal_quality', 'pressure', 'motor_speed', 'status']
        command_parameters = ['out1', 'out2', 'in1', 'in2', 'status', 'power_saving']
        nested_parameters = ['outputs.OUT1', 'outputs.OUT2', 'outputs.speed', 'outputs.power_saving', 'outputs.charging', 
                           'inputs.IN1', 'inputs.IN2']
        
        # Check if parameter exists in nested structure
        parameter_exists = False
        if '.' in parameter_name:
            # Handle nested parameters like outputs.OUT1
            if parameter_name in nested_parameters:
                parameter_exists = True
        else:
            # Handle direct parameters
            if parameter_name in data_parameters or parameter_name in command_parameters:
                parameter_exists = True
        
        if not parameter_exists:
            return False
        
        # Get last known value
        last_value = await get_last_parameter_value(subscription['device_id'], parameter_name)
        
        # Check if value changed
        has_changed = last_value is None or current_value != last_value
        
        if not has_changed:
            return False
        
        # Evaluate subscription condition
        should_trigger = evaluate_subscription_condition(
            subscription['condition_type'],
            current_value,
            subscription.get('threshold_value')
        )
        
        if should_trigger:
            # Update subscription trigger info
            await update_subscription_trigger(subscription['subscription_id'])
            
            # Store new value for future comparison
            await store_parameter_value(subscription['device_id'], parameter_name, current_value)
            
            return True
        
        return False
        
    except Exception as e:
        logger.error(f"Error checking subscription {subscription.get('subscription_id', 'unknown')}: {e}")
        return False

def evaluate_subscription_condition(condition_type, current_value, threshold_value):
    """Evaluate if subscription condition is met"""
    try:
        if condition_type == 'change':
            return True
        elif condition_type == 'above':
            return current_value > threshold_value
        elif condition_type == 'below':
            return current_value < threshold_value
        elif condition_type == 'equals':
            return current_value == threshold_value
        elif condition_type == 'not_equals':
            return current_value != threshold_value
        else:
            return False
    except Exception as e:
        logger.error(f"Error evaluating condition {condition_type}: {e}")
        return False

def get_last_parameter_value_sync(device_id, parameter_name):
    """Get the last known value for a parameter (synchronous version)"""
    try:
        # Get from subscription data table
        subscription_data_table = dynamodb.Table('IoT_SubscriptionData')
        
        response = subscription_data_table.get_item(
            Key={
                'device_id': device_id,
                'parameter_name': parameter_name
            }
        )
        
        if 'Item' in response:
            return response['Item'].get('last_value')
        
        return None
        
    except Exception as e:
        logger.error(f"Error getting last parameter value: {e}")
        return None

async def get_last_parameter_value(device_id, parameter_name):
    """Get the last known value for a parameter"""
    try:
        # Get from device data table
        device_data_table = dynamodb.Table('IoT_DeviceData')
        response = device_data_table.query(
            KeyConditionExpression=Key('client_id').eq(device_id),
            Limit=1,
            ScanIndexForward=False
        )
        
        if not response.get('Items'):
            return None
        
        latest_data = response['Items'][0]
        return latest_data.get(parameter_name)
        
    except Exception as e:
        logger.error(f"Error getting last parameter value: {e}")
        return None

def store_parameter_value_sync(device_id, parameter_name, value):
    """Store the current parameter value for future comparison (synchronous version)"""
    try:
        # Instead of storing in IoT_DeviceData, store in a separate table for subscription tracking
        # This prevents flooding the main device data table
        subscription_data_table = dynamodb.Table('IoT_SubscriptionData')
        
        current_timestamp = datetime.now(timezone.utc).isoformat()
        
        # Store/update the parameter value for this device
        subscription_data_table.put_item(
            Item={
                'device_id': device_id,
                'parameter_name': parameter_name,
                'last_value': value,
                'last_updated': current_timestamp,
                'ttl': int((datetime.now(timezone.utc) + timedelta(days=7)).timestamp())  # Auto-delete after 7 days
            }
        )
        
        logger.info(f"Stored parameter {parameter_name}={value} for device {device_id}")
        
    except Exception as e:
        logger.error(f"Error storing parameter value: {e}")

async def store_parameter_value(device_id, parameter_name, value):
    """Store the current parameter value for future comparison"""
    try:
        device_data_table = dynamodb.Table('IoT_DeviceData')
        device_data_table.update_item(
            Key={'client_id': device_id},
            UpdateExpression=f'SET {parameter_name} = :value, last_updated = :timestamp',
            ExpressionAttributeValues={
                ':value': value,
                ':timestamp': datetime.now(timezone.utc).isoformat()
            }
        )
    except Exception as e:
        logger.error(f"Error storing parameter value: {e}")

def update_subscription_trigger_sync(subscription_id):
    """Update subscription trigger count and timestamp (synchronous version)"""
    try:
        # First, get the subscription to find the user_email
        response = subscriptions_table.scan(
            FilterExpression='subscription_id = :subscription_id',
            ExpressionAttributeValues={
                ':subscription_id': subscription_id
            }
        )
        
        if not response.get('Items'):
            logger.warning(f"Subscription {subscription_id} not found")
            return
        
        subscription = response['Items'][0]
        user_email = subscription['user_email']
        
        subscriptions_table.update_item(
            Key={
                'user_email': user_email,
                'subscription_id': subscription_id
            },
            UpdateExpression='SET last_triggered = :last_triggered, trigger_count = trigger_count + :increment',
            ExpressionAttributeValues={
                ':last_triggered': datetime.now(timezone.utc).isoformat(),
                ':increment': 1
            }
        )
    except Exception as e:
        logger.error(f"Error updating subscription trigger: {e}")

async def update_subscription_trigger(subscription_id):
    """Update subscription trigger count and timestamp"""
    try:
        subscriptions_table.update_item(
            Key={
                'user_email': 'system',  # This would need proper user email handling
                'subscription_id': subscription_id
            },
            UpdateExpression='SET last_triggered = :last_triggered, trigger_count = trigger_count + :increment',
            ExpressionAttributeValues={
                ':last_triggered': datetime.now(timezone.utc).isoformat(),
                ':increment': 1
            }
        )
    except Exception as e:
        logger.error(f"Error updating subscription trigger: {e}")

def trigger_subscription_notification_sync(subscription, device_data, message_type):
    """Trigger a subscription notification (synchronous version)"""
    try:
        parameter_name = subscription['parameter_name']
        current_value = extract_parameter_value(device_data, parameter_name)
        current_value_normalized = normalize_value_for_comparison(current_value)
        
        # Create notification
        notification = {
            'user_email': subscription['user_email'],
            'notification_id': f"{subscription['subscription_id']}_{int(datetime.now().timestamp())}",
            'subscription_id': subscription['subscription_id'],
            'device_id': subscription['device_id'],
            'parameter_name': parameter_name,
            'current_value': current_value_normalized,
            'condition_type': subscription['condition_type'],
            'threshold_value': subscription.get('threshold_value'),
            'message_type': message_type,
            'message': format_notification_message(subscription, current_value_normalized, message_type),
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'read': False
        }
        
        # Store notification (if table exists)
        try:
            notifications_table.put_item(Item=notification)
        except Exception as table_error:
            logger.warning(f"Could not store notification (table may not exist): {table_error}")
        
        # Send email if configured
        if subscription['notification_method'] in ['email', 'both']:
            send_email_notification_sync(notification)
        
        # Execute command actions if configured
        if subscription.get('commands'):
            execute_multiple_commands_sync(subscription)
        
        logger.info(f"Subscription triggered: {subscription['subscription_id']} - {parameter_name} = {current_value_normalized}")
        
    except Exception as e:
        logger.error(f"Error triggering subscription notification: {e}")

async def trigger_subscription_notification(subscription, device_data, message_type):
    """Trigger a subscription notification"""
    try:
        parameter_name = subscription['parameter_name']
        current_value = device_data.get(parameter_name)
        
        # Create notification
        notification = {
            'user_email': subscription['user_email'],
            'notification_id': f"{subscription['subscription_id']}_{int(datetime.now().timestamp())}",
            'subscription_id': subscription['subscription_id'],
            'device_id': subscription['device_id'],
            'parameter_name': parameter_name,
            'current_value': current_value,
            'condition_type': subscription['condition_type'],
            'threshold_value': subscription.get('threshold_value'),
            'message_type': message_type,
            'message': format_notification_message(subscription, current_value, message_type),
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'read': False
        }
        
        # Store notification
        notifications_table.put_item(Item=notification)
        
        # Send email if configured
        if subscription['notification_method'] in ['email', 'both']:
            await send_email_notification(notification)
        
        # Execute command actions if configured
        if subscription.get('commands'):
            await execute_multiple_commands(subscription)
        
        logger.info(f"Subscription triggered: {subscription['subscription_id']} - {parameter_name} = {current_value}")
        
    except Exception as e:
        logger.error(f"Error triggering subscription notification: {e}")

def format_notification_message(subscription, current_value, message_type):
    """Format notification message"""
    parameter_name = subscription['parameter_name']
    condition_type = subscription['condition_type']
    threshold_value = subscription.get('threshold_value')
    
    # Add message type context (status is special - can be both)
    if parameter_name == 'status':
        type_context = "status"
    else:
        type_context = "data" if message_type == 'data' else "command"
    
    if condition_type == 'change':
        return f"{parameter_name} {type_context} changed to {current_value}"
    elif condition_type == 'above':
        return f"{parameter_name} {type_context} ({current_value}) is above threshold ({threshold_value})"
    elif condition_type == 'below':
        return f"{parameter_name} {type_context} ({current_value}) is below threshold ({threshold_value})"
    elif condition_type == 'equals':
        return f"{parameter_name} {type_context} equals {current_value}"
    elif condition_type == 'not_equals':
        return f"{parameter_name} {type_context} ({current_value}) is not equal to {threshold_value}"
    else:
        return f"{parameter_name} {type_context} value changed to {current_value}"

def send_email_notification_sync(notification):
    """Send email notification (synchronous version)"""
    try:
        # Implement email sending logic here
        # This could use SES, SNS, or another email service
        logger.info(f"Email notification: {notification['message']}")
        
        # Example: Send to SNS topic
        # sns = boto3.client('sns')
        # sns.publish(
        #     TopicArn='your-sns-topic-arn',
        #     Message=notification['message'],
        #     Subject=f"Device Alert: {notification['device_id']}"
        # )
        
    except Exception as e:
        logger.error(f"Error sending email notification: {e}")

async def send_email_notification(notification):
    """Send email notification"""
    try:
        # Implement email sending logic here
        # This could use SES, SNS, or another email service
        logger.info(f"Email notification: {notification['message']}")
        
        # Example: Send to SNS topic
        # sns = boto3.client('sns')
        # sns.publish(
        #     TopicArn='your-sns-topic-arn',
        #     Message=notification['message'],
        #     Subject=f"Device Alert: {notification['device_id']}"
        # )
        
    except Exception as e:
        logger.error(f"Error sending email notification: {e}")

def execute_multiple_commands_sync(subscription):
    """Execute multiple command actions when subscription is triggered (synchronous version)"""
    try:
        device_id = subscription['device_id']
        commands = subscription.get('commands', [])
        
        # Filter out 'none' commands and invalid commands
        active_commands = []
        for cmd in commands:
            if not cmd.get('action') or cmd.get('action') == 'none':
                continue
            # Validate command format before adding to active list
            if is_valid_command_format(cmd.get('action', ''), cmd.get('value', '')):
                active_commands.append(cmd)
            else:
                logger.warning(f"Skipping invalid command: action={cmd.get('action')}, value={cmd.get('value')}")
        
        if not active_commands:
            logger.info("No valid commands to execute")
            return True
        
        # Use boto3 IoT client to publish
        import boto3
        iot_client = boto3.client('iot-data')
        
        # Execute each command
        for command in active_commands:
            command_action = command['action']
            command_value = command.get('value', '')
            target_device = command.get('target_device', device_id)  # Default to same device
            
            # Create command payload in the format expected by PCB
            if command_action == 'out1':
                if command_value == '1':
                    command_payload = {"command": "TOGGLE_1_ON"}
                else:
                    command_payload = {"command": "TOGGLE_1_OFF"}
            elif command_action == 'out2':
                if command_value == '1':
                    command_payload = {"command": "TOGGLE_2_ON"}
                else:
                    command_payload = {"command": "TOGGLE_2_OFF"}
            elif command_action == 'motor_speed':
                command_payload = {"command": "SET_SPEED", "speed": int(command_value)}
            elif command_action == 'power_saving':
                if command_value == '1':
                    command_payload = {"command": "POWER_SAVING_ON"}
                else:
                    command_payload = {"command": "POWER_SAVING_OFF"}
            else:
                # Fallback to generic format
                command_payload = {
                    'device_id': target_device,
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'command_type': command_action,
                    'value': command_value
                }
            
            # Publish command to IoT Core
            topic = f"NBtechv1/{target_device}/cmd/"
            
            response = iot_client.publish(
                topic=topic,
                payload=json.dumps(command_payload),
                qos=1
            )
            
            logger.info(f"Command sent to {topic}: {command_payload}")
        
        logger.info(f"Executed {len(active_commands)} commands for device {device_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error executing multiple commands: {e}")
        return False

async def execute_multiple_commands(subscription):
    """Execute multiple command actions when subscription is triggered"""
    try:
        device_id = subscription['device_id']
        commands = subscription.get('commands', [])
        
        # Filter out 'none' commands
        active_commands = [cmd for cmd in commands if cmd.get('action') and cmd.get('action') != 'none']
        
        if not active_commands:
            logger.info("No active commands to execute")
            return True
        
        # Use boto3 IoT client to publish
        import boto3
        iot_client = boto3.client('iot-data')
        
        # Execute each command
        for command in active_commands:
            command_action = command['action']
            command_value = command.get('value', '')
            target_device = command.get('target_device', device_id)  # Default to same device
            
            # Create command payload
            command_payload = {
                'device_id': target_device,
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'command_type': command_action,
                'value': command_value
            }
            
            # Publish command to IoT Core
            topic = f"NBtechv1/{target_device}/cmd/{command_action}"
            
            response = iot_client.publish(
                topic=topic,
                payload=json.dumps(command_payload),
                qos=1
            )
            
            logger.info(f"Command sent to {topic}: {command_payload}")
        
        logger.info(f"Executed {len(active_commands)} commands for device {device_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error executing multiple commands: {e}")
        return False

async def execute_command_action(subscription):
    """Execute single command action when subscription is triggered (legacy support)"""
    try:
        device_id = subscription['device_id']
        command_action = subscription['command_action']
        command_value = subscription.get('command_value', '')
        
        # Create command payload in the format expected by PCB
        if command_action == 'out1':
            if command_value == '1':
                command_payload = {"command": "TOGGLE_1_ON"}
            else:
                command_payload = {"command": "TOGGLE_1_OFF"}
        elif command_action == 'out2':
            if command_value == '1':
                command_payload = {"command": "TOGGLE_2_ON"}
            else:
                command_payload = {"command": "TOGGLE_2_OFF"}
        elif command_action == 'motor_speed':
            command_payload = {"command": "SET_SPEED", "speed": int(command_value)}
        elif command_action == 'power_saving':
            if command_value == '1':
                command_payload = {"command": "POWER_SAVING_ON"}
            else:
                command_payload = {"command": "POWER_SAVING_OFF"}
        else:
            # Fallback to generic format
            command_payload = {
                'device_id': device_id,
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'command_type': command_action,
                'value': command_value
            }
        
        # Publish command to IoT Core
        topic = f"NBtechv1/{device_id}/cmd/"
        
        # Use boto3 IoT client to publish
        import boto3
        iot_client = boto3.client('iot-data')
        
        response = iot_client.publish(
            topic=topic,
            payload=json.dumps(command_payload),
            qos=1
        )
        
        logger.info(f"Command sent to {topic}: {command_payload}")
        return True
        
    except Exception as e:
        logger.error(f"Error executing command action: {e}")
        return False

# =============================================================================
# ROBUST SAFEGUARD FUNCTIONS
# =============================================================================

def check_subscription_cooldown_sync(subscription):
    """Check if subscription is in cooldown period to prevent spam"""
    try:
        subscription_id = subscription.get('subscription_id')
        user_email = subscription.get('user_email')
        
        if not subscription_id or not user_email:
            logger.warning(f"Missing subscription_id or user_email for cooldown check")
            return True  # Allow on error to avoid blocking
        
        # Get subscription data to check last trigger time (using correct table keys)
        response = subscriptions_table.get_item(
            Key={
                'user_email': user_email,
                'subscription_id': subscription_id
            }
        )
        
        if 'Item' not in response:
            return True  # No previous trigger, allow
        
        subscription_item = response['Item']
        last_triggered = subscription_item.get('last_triggered')
        
        if not last_triggered:
            return True  # Never triggered, allow
        
        # Parse last trigger time
        last_trigger_time = datetime.fromisoformat(last_triggered.replace('Z', '+00:00'))
        current_time = datetime.now(timezone.utc)
        
        # Cooldown period: 30 seconds minimum between triggers
        cooldown_seconds = 30
        time_diff = (current_time - last_trigger_time).total_seconds()
        
        if time_diff < cooldown_seconds:
            logger.info(f"Subscription {subscription_id} cooldown: {cooldown_seconds - time_diff:.1f}s remaining")
            return False
        
        return True
        
    except Exception as e:
        logger.error(f"Error checking cooldown for subscription {subscription.get('subscription_id', 'unknown')}: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return True  # Allow on error to avoid blocking

def check_self_triggering_loop_sync(subscription, device_data):
    """Check if subscription would create a self-triggering loop"""
    try:
        subscription_id = subscription['subscription_id']
        device_id = subscription['device_id']
        parameter_name = subscription['parameter_name']
        commands = subscription.get('commands', [])
        
        # Check each command for potential loops
        for command in commands:
            if command.get('action') == 'none':
                continue
                
            target_device = command.get('target_device', device_id)
            command_action = command.get('action', '')
            
            # Loop prevention: Don't send commands to the same device being monitored
            if target_device == device_id:
                # Check if the command would affect the monitored parameter
                if would_command_affect_parameter(command_action, parameter_name):
                    logger.warning(f"Loop detected: {command_action} would affect {parameter_name}")
                    return True
                    
            # Additional loop prevention: Check for parameter coupling
            if is_parameter_coupled(parameter_name, command_action):
                logger.warning(f"Parameter coupling detected: {parameter_name} <-> {command_action}")
                return True
        
        return False
        
    except Exception as e:
        logger.error(f"Error checking self-triggering loop: {e}")
        return False  # Allow on error

def validate_command_targets_sync(subscription):
    """Validate that command targets are safe and won't cause loops"""
    try:
        device_id = subscription['device_id']
        commands = subscription.get('commands', [])
        
        for command in commands:
            if command.get('action') == 'none':
                continue
                
            target_device = command.get('target_device', device_id)
            command_action = command.get('action', '')
            command_value = command.get('value', '')
            
            # Validate command format - skip invalid commands but don't block subscription
            if not is_valid_command_format(command_action, command_value):
                logger.warning(f"Invalid command format: {command_action}={command_value} - skipping this command but allowing subscription")
                continue  # Skip this command but continue validation
                
            # Check for dangerous command combinations
            if is_dangerous_command_combination(device_id, target_device, command_action):
                logger.warning(f"Dangerous command combination detected: {command_action} to {target_device} - blocking subscription")
                return False
        
        return True
        
    except Exception as e:
        logger.error(f"Error validating command targets: {e}")
        return False

def would_command_affect_parameter(command_action, parameter_name):
    """Check if a command would affect the monitored parameter"""
    # Map command actions to parameters they affect
    command_parameter_map = {
        'out1': ['outputs.OUT1', 'outputs.out1'],
        'out2': ['outputs.OUT2', 'outputs.out2'],
        'in1': ['inputs.IN1', 'inputs.in1'],
        'in2': ['inputs.IN2', 'inputs.in2'],
        'speed': ['outputs.speed', 'motor_speed'],
        'power_saving': ['outputs.power_saving', 'power_saving']
    }
    
    affected_parameters = command_parameter_map.get(command_action.lower(), [])
    return parameter_name.lower() in [p.lower() for p in affected_parameters]

def is_parameter_coupled(parameter_name, command_action):
    """Check if parameters are coupled (changing one affects the other)"""
    # Known parameter couplings
    coupled_groups = [
        ['outputs.OUT1', 'outputs.OUT2'],  # OUT1 and OUT2 might be coupled
        ['inputs.IN1', 'inputs.IN2'],     # IN1 and IN2 might be coupled
        ['outputs.speed', 'motor_speed'],  # Speed parameters
        ['battery', 'power_saving']        # Battery and power saving
    ]
    
    for group in coupled_groups:
        if parameter_name.lower() in [p.lower() for p in group]:
            if command_action.lower() in [p.lower().replace('outputs.', '').replace('inputs.', '') for p in group]:
                return True
    
    return False

def is_valid_command_format(command_action, command_value):
    """Validate command format"""
    valid_actions = ['out1', 'out2', 'in1', 'in2', 'speed', 'power_saving', 'restart', 'none']
    
    if command_action not in valid_actions:
        return False
        
    # Validate value format based on action
    if command_action in ['out1', 'out2', 'in1', 'in2']:
        return command_value in ['0', '1', 'on', 'off', 'true', 'false']
    elif command_action == 'speed':
        try:
            speed = int(command_value)
            return 0 <= speed <= 100
        except:
            return False
    elif command_action == 'power_saving':
        return command_value in ['0', '1', 'on', 'off', 'true', 'false']
    elif command_action == 'restart':
        return True  # No value needed for restart
        
    return True

def is_dangerous_command_combination(device_id, target_device, command_action):
    """Check for dangerous command combinations"""
    # Restart commands are always dangerous (could cause device to go offline)
    if command_action == 'restart':
        return True
        
    # Output commands to the same device are normal and safe
    # They are the intended use case for subscriptions
    # No other commands are considered dangerous
        
    return False
