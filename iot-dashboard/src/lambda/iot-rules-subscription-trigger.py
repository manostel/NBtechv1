import json
import boto3
import logging
from datetime import datetime, timezone
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
        logger.info("IoT Rules triggered: %s", json.dumps(event))
        
        # Extract device information from IoT Core event
        device_id = extract_device_id(event)
        device_data = extract_device_data(event)
        topic = event.get('topic', '')
        
        if not device_id or not device_data:
            logger.warning("No valid device ID or data found")
            return {'statusCode': 400, 'body': 'Invalid event data'}
        
        # Determine message type (data or command)
        message_type = 'data' if '/data/' in topic else 'command' if '/cmd/' in topic else 'unknown'
        logger.info(f"Processing {message_type} message for device: {device_id}")
        
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
        if 'topic' in event:
            # Extract from topic: NBtechv1/{device_id}/data/... or NBtechv1/{device_id}/cmd/...
            topic_parts = event['topic'].split('/')
            if len(topic_parts) >= 2:
                return topic_parts[1]
        
        # Alternative: extract from payload
        if 'payload' in event:
            payload = json.loads(event['payload'])
            return payload.get('client_id')
            
        return None
    except Exception as e:
        logger.error(f"Error extracting device ID: {e}")
        return None

def extract_device_data(event):
    """Extract device data from IoT Core event"""
    try:
        # IoT Core Rules Engine provides the message payload
        if 'payload' in event:
            return json.loads(event['payload'])
        
        # Alternative: direct data
        if 'data' in event:
            return event['data']
            
        return event
    except Exception as e:
        logger.error(f"Error extracting device data: {e}")
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
            # Only check subscriptions that match the message type
            if check_single_subscription_sync(subscription, device_data, message_type):
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

def check_single_subscription_sync(subscription, device_data, message_type):
    """Check if a single subscription should trigger (synchronous version)"""
    try:
        parameter_name = subscription['parameter_name']
        logger.info(f"Checking subscription for parameter: {parameter_name}")
        logger.info(f"Device data: {json.dumps(device_data, default=str)}")
        
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
            logger.info(f"Extracted nested value for {parameter_name}: {current_value}")
        else:
            # Handle direct parameters
            current_value = device_data.get(parameter_name)
            logger.info(f"Extracted direct value for {parameter_name}: {current_value}")
        
        if current_value is None:
            logger.warning(f"Parameter {parameter_name} not found in device data")
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
        last_value = get_last_parameter_value_sync(subscription['device_id'], parameter_name)
        
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
            update_subscription_trigger_sync(subscription['subscription_id'])
            
            # Store new value for future comparison
            store_parameter_value_sync(subscription['device_id'], parameter_name, current_value)
            
            return True
        
        return False
        
    except Exception as e:
        logger.error(f"Error checking subscription {subscription.get('subscription_id', 'unknown')}: {e}")
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
        device_data_table = dynamodb.Table('IoT_DeviceData')
        
        # Try to update existing item first
        try:
            device_data_table.update_item(
                Key={'client_id': device_id},
                UpdateExpression=f'SET {parameter_name} = :value, last_updated = :timestamp',
                ExpressionAttributeValues={
                    ':value': value,
                    ':timestamp': datetime.now(timezone.utc).isoformat()
                }
            )
        except Exception as update_error:
            # If update fails, try to put a new item with proper schema
            logger.warning(f"Update failed, trying to create new item: {update_error}")
            device_data_table.put_item(
                Item={
                    'client_id': device_id,
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    parameter_name: value,
                    'last_updated': datetime.now(timezone.utc).isoformat()
                }
            )
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
        
        logger.info(f"Subscription triggered: {subscription['subscription_id']} - {parameter_name} = {current_value}")
        
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
