import json
import boto3
import os
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
        if topic.startswith('NBtechv1/') and '/data' in topic:
            message_type = 'data'
        elif topic.startswith('NBtechv1/') and '/cmd' in topic:
            message_type = 'command'
        else:
            message_type = 'unknown'
            
        logger.info(f"Processing {message_type} message for device: {device_id}")
        logger.info(f"Full topic path: {topic}")
        
        # 1. Check for Input/Output State Changes (Independent of subscriptions)
        # This ensures we get notified about I/O changes even without specific subscriptions
        check_io_state_changes(device_id, device_data)
        
        # 2. Check for Legacy Alarms (IoT_DeviceAlarms table)
        # This ensures "Alarms Tab" logic works independently
        check_legacy_alarms(device_id, device_data)
        
        # 3. Check for Subscription Triggers (IoT_DeviceSubscriptions table)
        # This is the new, flexible rule engine
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

def check_io_state_changes(device_id, device_data):
    """
    Check for Input/Output state changes by comparing with stored state.
    Sends notification if state changed.
    """
    try:
        # Define IO parameters to monitor
        io_params = ['out1_state', 'out2_state', 'in1_state', 'in2_state']
        
        # Check if any IO params are present in current data
        present_params = [p for p in io_params if p in device_data]
        if not present_params:
            return
            
        # Get last known state from IoT_DeviceData table
        device_data_table = dynamodb.Table('IoT_DeviceData')
        response = device_data_table.query(
            KeyConditionExpression=Key('client_id').eq(device_id),
            Limit=1,
            ScanIndexForward=False
        )
        
        if not response.get('Items'):
            return
            
        last_state = response['Items'][0]
        
        for param in present_params:
            current_val = device_data[param]
            last_val = last_state.get(param)
            
            # Normalize for comparison (0/1, True/False)
            curr_norm = 1 if current_val in [1, '1', True, 'true', 'on', 'ON'] else 0
            last_norm = 1 if last_val in [1, '1', True, 'true', 'on', 'ON'] else 0
            
            if curr_norm != last_norm:
                # State Changed!
                io_type = "Output" if "out" in param else "Input"
                io_num = "1" if "1" in param else "2"
                state_str = "ON" if curr_norm == 1 else "OFF"
                
                message = f"{io_type} {io_num} changed to {state_str}"
                
                logger.info(f"IO State Change detected for {device_id}: {param} {last_norm}->{curr_norm}")
                
                # Construct notification payload
                notification = {
                    'message': message,
                    'parameter_name': param,
                    'device_id': device_id,
                    'subscription_id': 'io_change', # Virtual ID
                    'current_value': state_str
                }
                
                # Send Push
                send_sns_push_notification_sync(notification)
                
    except Exception as e:
        logger.error(f"Error checking IO state changes: {e}")

def check_legacy_alarms(device_id, device_data):
    """
    Check "Alarms Tab" rules (IoT_DeviceAlarms table).
    This ensures alarms work independently of the dashboard.
    """
    try:
        alarms_table = dynamodb.Table('IoT_DeviceAlarms')
        
        # Get all alarms for this device
        response = alarms_table.query(
            KeyConditionExpression=Key('client_id').eq(device_id)
        )
        
        alarms = response.get('Items', [])
        if not alarms:
            return

        for alarm in alarms:
            if not alarm.get('enabled', True) and not alarm.get('is_active', True):
                continue
                
            variable = alarm.get('variable_name')
            if variable not in device_data:
                continue
                
            current_val = device_data[variable]
            threshold = float(alarm['threshold'])
            condition = alarm['condition']
            
            # Convert Decimal/String to float
            if isinstance(current_val, Decimal): current_val = float(current_val)
            elif isinstance(current_val, str): 
                try: current_val = float(current_val)
                except: continue
            
            should_trigger = False
            if condition == 'above' and current_val > threshold:
                should_trigger = True
            elif condition == 'below' and current_val < threshold:
                should_trigger = True
                
            if should_trigger:
                # Check cooldown (basic check using last_triggered)
                last_trig = alarm.get('last_triggered')
                if last_trig:
                    # Simple 1-minute cooldown
                    last_time = datetime.fromisoformat(last_trig.replace('Z', '+00:00'))
                    if (datetime.now(timezone.utc) - last_time).total_seconds() < 60:
                        continue

                logger.info(f"Legacy Alarm triggered for {device_id}: {variable} {condition} {threshold}")
                
                # Update last_triggered
                alarms_table.update_item(
                    Key={'client_id': device_id, 'alarm_id': alarm['alarm_id']},
                    UpdateExpression="SET last_triggered = :now",
                    ExpressionAttributeValues={':now': datetime.now(timezone.utc).isoformat()}
                )
                
                # Send Push
                notification = {
                    'message': f"ALARM: {variable} is {current_val} ({condition} {threshold})",
                    'parameter_name': variable,
                    'device_id': device_id,
                    'subscription_id': alarm['alarm_id'],
                    'current_value': current_val
                }
                send_sns_push_notification_sync(notification)
                
    except Exception as e:
        logger.error(f"Error checking legacy alarms: {e}")

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
        
        # Get last known value from the subscription record itself
        last_value = get_last_parameter_value_sync(device_id, parameter_name, subscription_id, subscription['user_email'])
        last_value_normalized = normalize_value_for_comparison(last_value)
        
        logger.info(f"Last value for {parameter_name}: {last_value} (normalized: {last_value_normalized})")
        
        # CRITICAL: Check if value changed from last stored state
        # We only trigger subscriptions when the actual device state changes
        # This ensures trigger count only increments on real state transitions
        if last_value_normalized is None:
            # First time seeing this parameter - consider it changed
            has_changed = True
            logger.info(f"Parameter {parameter_name} - first time detected, considering as changed")
        elif isinstance(current_value_normalized, (int, float)) and isinstance(last_value_normalized, (int, float)):
            # For numeric values, use configurable tolerance to only trigger on meaningful changes
            # This prevents false triggers from sensor noise and small fluctuations
            
            # Check if subscription has custom tolerance_percent configured
            # Users can set this when creating/editing subscriptions for fine-tuned control
            tolerance_percent = subscription.get('tolerance_percent')
            
            if tolerance_percent is None:
                # Use parameter-specific defaults if not configured
                # Some parameters are more stable (battery), others fluctuate more (signal_quality)
                tolerance_percentages = {
                    'battery': 0.02,           # 2% - battery changes slowly
                    'temperature': 0.03,       # 3% - temperature can fluctuate more
                    'humidity': 0.03,         # 3% - humidity fluctuates
                    'pressure': 0.02,         # 2% - pressure is relatively stable
                    'signal_quality': 0.05,    # 5% - signal quality can jump around
                    'motor_speed': 0.02,      # 2% - motor speed is relatively stable
                }
                tolerance_percent = tolerance_percentages.get(parameter_name.lower(), 0.02)
                logger.info(f"Using default tolerance for {parameter_name}: {tolerance_percent*100:.1f}%")
            else:
                # Convert to float if it's stored as Decimal or string
                if isinstance(tolerance_percent, Decimal):
                    tolerance_percent = float(tolerance_percent)
                elif isinstance(tolerance_percent, str):
                    tolerance_percent = float(tolerance_percent)
                logger.info(f"Using custom tolerance for {parameter_name}: {tolerance_percent*100:.1f}%")
            
            # Calculate tolerance: use percentage of current value, with minimum absolute threshold
            # For very small values (< 1), use minimum absolute change of 0.01
            # For larger values, use the percentage
            if abs(current_value_normalized) < 1:
                tolerance = 0.01  # Minimum absolute change for very small values
            else:
                tolerance = max(abs(current_value_normalized) * tolerance_percent, 0.01)
            
            has_changed = abs(current_value_normalized - last_value_normalized) > tolerance
            if has_changed:
                logger.info(f"Parameter {parameter_name} value changed: {last_value_normalized} -> {current_value_normalized} (diff: {abs(current_value_normalized - last_value_normalized):.3f}, tolerance: {tolerance:.3f})")
            else:
                logger.info(f"Parameter {parameter_name} value unchanged: {current_value_normalized} (within tolerance: {tolerance:.3f})")
        else:
            # For non-numeric values, use exact comparison
            has_changed = current_value_normalized != last_value_normalized
            if has_changed:
                logger.info(f"Parameter {parameter_name} value changed: {last_value_normalized} -> {current_value_normalized}")
            else:
                logger.info(f"Parameter {parameter_name} value unchanged: {current_value_normalized}")
        
        # IMPORTANT: Only proceed if value actually changed
        # This ensures trigger count reflects actual state changes, not repeated same values
        if not has_changed:
            # Value is within tolerance - not a meaningful change for triggering
            # BUT we should still update the stored value to track the current baseline
            # This prevents the stored value from getting "stuck" at an old value
            # when there are small fluctuations that don't exceed the tolerance
            logger.info(f"Parameter {parameter_name} value unchanged ({current_value_normalized}) - skipping trigger (no state change detected)")
            # Update stored value to current value even though it's within tolerance
            # This keeps the baseline current without triggering subscriptions
            store_parameter_value_sync(device_id, parameter_name, current_value_normalized, subscription_id, subscription['user_email'])
            logger.info(f"Updated stored value to {current_value_normalized} (within tolerance, no trigger)")
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
                store_parameter_value_sync(device_id, parameter_name, current_value_normalized, subscription_id, subscription['user_email'])
                logger.info(f"Stored new value for 'change' condition: {current_value_normalized}")
            
            # Check cooldown period
            # IMPORTANT: Cooldown only applies AFTER a successful trigger
            # The cooldown checks 'last_triggered' timestamp, which is ONLY updated
            # when update_subscription_trigger_sync() is called (after successful trigger)
            # This means: First trigger always succeeds, subsequent triggers respect cooldown
            if not check_subscription_cooldown_sync(subscription):
                logger.info(f"Subscription {subscription_id} in cooldown period - skipping (cooldown only applies after previous successful trigger)")
                # Value already stored for "change" condition, so it won't retrigger on same value
                # NOTE: last_triggered is NOT updated here, so cooldown period doesn't reset
                return False
            
            logger.info(f"✅ Subscription {subscription_id} conditions met AND state changed - triggering!")
            
            # Update subscription trigger count - ONLY increments when state changed AND condition met
            # This ensures accurate trigger counting for actual state transitions
            update_subscription_trigger_sync(subscription_id)
            
            # Store new value for future comparison (for non-"change" conditions)
            # This is already done for "change" condition above (before cooldown checks)
            if condition_type != 'change':
                store_parameter_value_sync(device_id, parameter_name, current_value_normalized, subscription_id, subscription['user_email'])
            
            return True
        
        # Condition not met, but value changed - store the new value anyway
        # This tracks the state properly and prevents false triggers in future
        # NOTE: Trigger count was NOT incremented because condition wasn't met
        logger.info(f"Parameter {parameter_name} changed but condition not met - storing new value for future comparison")
        store_parameter_value_sync(device_id, parameter_name, current_value_normalized, subscription_id, subscription['user_email'])
        
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

def get_last_parameter_value_sync(device_id, parameter_name, subscription_id, user_email):
    """Get the last known value for a parameter from the subscription record (synchronous version)"""
    try:
        # Get the last processed value from the subscription record itself
        # This avoids needing a separate table
        response = subscriptions_table.get_item(
            Key={
                'user_email': user_email,
                'subscription_id': subscription_id
            }
        )
        
        if 'Item' in response:
            subscription_item = response['Item']
            # Check if this subscription has the same parameter
            if subscription_item.get('parameter_name') == parameter_name and subscription_item.get('device_id') == device_id:
                last_value = subscription_item.get('last_processed_value')
                
                if last_value is not None:
                    # Convert Decimal to float for comparison (DynamoDB returns Decimal)
                    if isinstance(last_value, Decimal):
                        return float(last_value)
                    elif isinstance(last_value, (int, float)):
                        return float(last_value)
                    else:
                        return last_value  # String or other types
        
        # No previous value stored - this is normal for first time
        logger.info(f"No previous value stored for {parameter_name} on subscription {subscription_id} (first time)")
        return None
        
    except Exception as e:
        logger.error(f"Error getting last parameter value: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
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

def store_parameter_value_sync(device_id, parameter_name, value, subscription_id, user_email):
    """Store the current parameter value in the subscription record for future comparison (synchronous version)"""
    try:
        # Store the last processed value directly in the subscription record
        # This avoids needing a separate table and keeps state per subscription
        
        # Convert float to Decimal for DynamoDB compatibility
        # DynamoDB requires Decimal types for numeric values, not float
        if isinstance(value, float):
            value_to_store = Decimal(str(value))
        elif isinstance(value, int):
            value_to_store = Decimal(value)
        else:
            value_to_store = value  # String or other types
        
        # Update the subscription record with the last processed value
        subscriptions_table.update_item(
            Key={
                'user_email': user_email,
                'subscription_id': subscription_id
            },
            UpdateExpression='SET last_processed_value = :value',
            ExpressionAttributeValues={
                ':value': value_to_store
            }
        )
        
        logger.info(f"Stored parameter {parameter_name}={value_to_store} (original: {value}) in subscription {subscription_id}")
        
    except Exception as e:
        logger.error(f"Error storing parameter value: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")

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
    """
    Update subscription trigger count and timestamp (synchronous version)
    
    IMPORTANT: This function should ONLY be called when:
    1. Parameter value changed from last stored state
    2. Subscription condition is met
    3. All safety checks passed (cooldown, loop prevention, etc.)
    
    This ensures trigger_count accurately reflects actual state change triggers.
    """
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
        
        # Get current trigger count before update
        current_count = subscription.get('trigger_count', 0)
        
        subscriptions_table.update_item(
            Key={
                'user_email': user_email,
                'subscription_id': subscription_id
            },
            UpdateExpression='SET last_triggered = :last_triggered, trigger_count = trigger_count + :increment',
            ExpressionAttributeValues={
                ':last_triggered': datetime.now(timezone.utc).isoformat(),
                ':increment': 1
            },
            ReturnValues='UPDATED_NEW'
        )
        
        new_count = current_count + 1
        logger.info(f"✅ Trigger count updated for subscription {subscription_id}: {current_count} -> {new_count} (state change detected)")
        
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
        # Convert numeric values to Decimal for DynamoDB compatibility
        current_value_for_notification = current_value_normalized
        if isinstance(current_value_normalized, float):
            current_value_for_notification = Decimal(str(current_value_normalized))
        elif isinstance(current_value_normalized, int):
            current_value_for_notification = Decimal(current_value_normalized)
            
        threshold_value_for_notification = subscription.get('threshold_value')
        if threshold_value_for_notification is not None:
            try:
                threshold_float = float(threshold_value_for_notification) if isinstance(threshold_value_for_notification, str) else threshold_value_for_notification
                if isinstance(threshold_float, float):
                    threshold_value_for_notification = Decimal(str(threshold_float))
                elif isinstance(threshold_float, int):
                    threshold_value_for_notification = Decimal(threshold_float)
            except (ValueError, TypeError):
                pass  # Keep as string if can't convert
        
        notification = {
            'user_email': subscription['user_email'],
            'notification_id': f"{subscription['subscription_id']}_{int(datetime.now().timestamp())}",
            'subscription_id': subscription['subscription_id'],
            'device_id': subscription['device_id'],
            'parameter_name': parameter_name,
            'current_value': current_value_for_notification,
            'condition_type': subscription['condition_type'],
            'threshold_value': threshold_value_for_notification,
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
        if subscription.get('notification_method') in ['email', 'both']:
            send_email_notification_sync(notification)
            
        # Send Push Notification (SNS) - Independent of Dashboard
        # We send high priority push for all subscription triggers
        send_sns_push_notification_sync(notification)
        
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

def send_sns_push_notification_sync(notification):
    """
    Send SNS Push Notification by invoking the centralized sns-notification Lambda.
    This ensures consistent payload formatting and decoupling.
    """
    try:
        import boto3
        import json
        
        lambda_client = boto3.client('lambda')
        
        # Construct the payload for the sns-notification lambda
        # It expects: { action, message, subject, type, data... }
        payload = {
            "action": "send_notification",
            "message": notification['message'],
            "subject": f"Alert: {notification['parameter_name']} - {notification['device_id']}",
            "type": "subscription_trigger",
            # We can pass additional data that sns-notification will put into the 'data' field
            "data": {
                "subscription_id": notification['subscription_id'],
                "device_id": notification['device_id'],
                "parameter": notification['parameter_name'],
                "value": str(notification['current_value'])
            }
        }
        
        # The name/ARN of your SNS notification lambda
        # Ideally, get this from env var: os.environ.get('SNS_LAMBDA_ARN')
        # For now, we'll use the function name assuming it's in the same region/account
        target_function = os.environ.get('SNS_NOTIFICATION_LAMBDA', 'sns-notification')
        
        # Invoke asynchronously (Event) so we don't wait for the push to finish
        lambda_client.invoke(
            FunctionName=target_function,
            InvocationType='Event', 
            Payload=json.dumps(payload)
        )
        
        logger.info(f"Invoked {target_function} for notification")
        
    except Exception as e:
        logger.error(f"Error invoking SNS lambda: {e}")

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
        
        # If last_triggered doesn't exist, it means subscription never successfully triggered
        # In this case, allow the trigger (no cooldown period to wait for)
        # This ensures the first trigger always succeeds
        if not last_triggered:
            logger.info(f"Subscription {subscription_id} - no previous trigger, allowing (cooldown only applies after successful trigger)")
            return True  # Never triggered, allow
        
        # Parse last trigger time
        last_trigger_time = datetime.fromisoformat(last_triggered.replace('Z', '+00:00'))
        current_time = datetime.now(timezone.utc)

        # Cooldown: prefer per-subscription value in milliseconds, fallback to 30s
        cooldown_ms = subscription.get('cooldown_ms')
        if cooldown_ms is None:
            # Try to read from stored item in case UI/backend saved it there
            cooldown_ms = item.get('cooldown_ms') if isinstance(item, dict) else None
        if cooldown_ms is None:
            cooldown_ms = 30000  # default 30s
        try:
            cooldown_ms = int(cooldown_ms)
        except Exception:
            cooldown_ms = 30000

        if cooldown_ms <= 0:
            return True  # no cooldown

        time_diff_ms = int((current_time - last_trigger_time).total_seconds() * 1000)
        if time_diff_ms < cooldown_ms:
            remaining_ms = cooldown_ms - time_diff_ms
            logger.info(f"Subscription {subscription_id} cooldown: {remaining_ms/1000:.1f}s remaining (since last successful trigger at {last_triggered})")
            return False
        
        # Cooldown period has passed since last successful trigger
        logger.info(f"Subscription {subscription_id} cooldown period passed ({time_diff_ms/1000:.1f}s since last trigger)")
        return True
        
    except Exception as e:
        logger.error(f"Error checking cooldown for subscription {subscription.get('subscription_id', 'unknown')}: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return True  # Allow on error to avoid blocking

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

