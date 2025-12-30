<<<<<<< HEAD
=======
import json
import boto3
import logging
from datetime import datetime, timezone
from boto3.dynamodb.conditions import Key
from decimal import Decimal
from typing import Dict, List, Optional

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
iot_data_client = boto3.client('iot-data')

# Initialize DynamoDB tables
alarms_table = dynamodb.Table('IoT_DeviceAlarms')
device_states_table = dynamodb.Table('IoT_DeviceStatus')
device_data_table = dynamodb.Table('IoT_DeviceData')
devices_table = dynamodb.Table('Devices')

def decimal_default(obj):
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError

def get_cors_headers():
    """Return CORS headers for the response"""
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Origin,X-Requested-With',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,DELETE',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json'
    }

def get_available_variables(client_id):
    """Get available variables for a device"""
    try:
        response = device_data_table.query(
            KeyConditionExpression=Key('client_id').eq(client_id),
            Limit=1,
            ScanIndexForward=False
        )
        
        if not response['Items']:
            return []
            
        latest_item = response['Items'][0]
        exclude_columns = ['client_id', 'device', 'timestamp']
        return [key for key in latest_item.keys() if key not in exclude_columns]
    except Exception as e:
        print(f"Error getting available variables: {str(e)}")
        return []

def get_device_status(client_id):
    """Get current device status (Online/Offline) from Devices table connection_status"""
    try:
        # Get device from Devices table to check connection_status
        # Since Devices table has composite key, we need to scan
        response = devices_table.scan(
            FilterExpression='client_id = :cid',
            ExpressionAttributeValues={':cid': client_id},
            Limit=1
        )
        
        if response['Items']:
            device = response['Items'][0]
            # Use connection_status set by IoT Core presence events
            connection_status = device.get('connection_status')
            if connection_status:
                return connection_status
        
        # Fallback: if no connection_status, check last data timestamp (legacy behavior)
        response = device_data_table.query(
            KeyConditionExpression=Key('client_id').eq(client_id),
            Limit=1,
            ScanIndexForward=False
        )
        
        if not response['Items']:
            return 'Offline'
            
        latest_data = response['Items'][0]
        timestamp = latest_data.get('timestamp')
        
        if not timestamp:
            return 'Offline'
            
        # Check if device is online (within last 7 minutes) - legacy fallback
        from datetime import datetime, timezone, timedelta
        try:
            if isinstance(timestamp, str):
                last_update = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            else:
                last_update = timestamp
                
            now = datetime.now(timezone.utc)
            time_diff = now - last_update
            
            if time_diff <= timedelta(minutes=7):
                return 'Online'
            else:
                return 'Offline'
        except Exception as e:
            print(f"Error parsing timestamp: {str(e)}")
            return 'Offline'
            
    except Exception as e:
        print(f"Error getting device status: {str(e)}")
        return 'Offline'

def get_device_shadow(client_id):
    """Get device shadow state from AWS IoT"""
    try:
        response = iot_data_client.get_thing_shadow(thingName=client_id)
        shadow_document = json.loads(response['payload'].read())
        return shadow_document
    except Exception as e:
        logger.error(f"Error getting shadow for {client_id}: {e}")
        return None

def get_nested_value(data, key_path):
    """Get value from nested dictionary using dot notation (e.g., 'inputs.IN1')"""
    try:
        keys = key_path.split('.')
        value = data
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return None
        return value
    except Exception:
        return None

def evaluate_alarm_condition(alarm, current_value, device_status=None):
    """Evaluate if an alarm condition is met"""
    try:
        condition = alarm['condition']
        threshold = alarm.get('threshold')
        variable_name = alarm['variable_name']
        
        # Handle 'change' condition (no threshold needed)
        if condition == 'change':
            return True  # This would need to be tracked separately for actual change detection
        
        # Convert threshold to appropriate type
        # For boolean state parameters (IN1, IN2, OUT1, OUT2, charging, power_saving), threshold is "0" or "1"
        boolean_params = ['IN1', 'IN2', 'OUT1', 'OUT2', 'charging', 'power_saving']
        if variable_name in boolean_params and threshold is not None:
            # Convert threshold string "0" or "1" to integer
            threshold = int(threshold)
            # Ensure current_value is also int (shadow reports 0 or 1)
            if isinstance(current_value, (str, bool)):
                current_value = 1 if current_value in [1, '1', True, 'true', 'on', 'ON'] else 0
        
        # Handle numeric conditions
        if condition == 'above':
            return float(current_value) > float(threshold)
        elif condition == 'below':
            return float(current_value) < float(threshold)
        elif condition == 'equals':
            return current_value == threshold
        elif condition == 'not_equals':
            return current_value != threshold
        else:
            return False
            
    except Exception as e:
        logger.error(f"Error evaluating alarm condition: {str(e)}")
        return False

def create_alarm(client_id, alarm_data):
    """Create a new alarm for a device"""
    try:
        variable_name = alarm_data['variable_name']
        parameter_type = alarm_data.get('parameter_type', 'metrics')
        
        # Validate parameter based on type
        # Two groups: 'metrics' (telemetry) and 'state' (shadow reported)
        if parameter_type == 'metrics':
            # Metrics from telemetry table: battery, temperature, humidity, signal_quality, pressure
            valid_metrics = ['battery', 'temperature', 'humidity', 'signal_quality', 'pressure']
            if variable_name not in valid_metrics:
                raise ValueError(f"Metric alarms must use one of: {', '.join(valid_metrics)}")
        elif parameter_type == 'state':
            # State from shadow reported: IN1, IN2, OUT1, OUT2, charging, motor_speed, power_saving
            valid_states = ['IN1', 'IN2', 'OUT1', 'OUT2', 'charging', 'motor_speed', 'power_saving']
            if variable_name not in valid_states:
                raise ValueError(f"State alarms must use one of: {', '.join(valid_states)}")
        else:
            raise ValueError(f"Invalid parameter_type: {parameter_type}. Must be 'metrics' or 'state'")
        
        # Validate severity
        valid_severities = ['info', 'warning', 'error']
        severity = alarm_data.get('severity', 'info')
        if severity not in valid_severities:
            severity = 'info'

        # Generate unique alarm ID
        timestamp = datetime.now(timezone.utc).timestamp()
        alarm_id = f"{client_id}_{variable_name}_{timestamp}"
        
        alarm = {
            'client_id': client_id,
            'alarm_id': alarm_id,
            'parameter_type': parameter_type,
            'variable_name': variable_name,
            'condition': alarm_data['condition'],
            'threshold': alarm_data.get('threshold'),
            'description': alarm_data.get('description', ''),
            'severity': severity,
            'enabled': alarm_data.get('enabled', True),
            'created_at': datetime.now(timezone.utc).isoformat(),
            'last_triggered': None
        }
        
        alarms_table.put_item(Item=alarm)
        return alarm
    except Exception as e:
        print(f"Error creating alarm: {str(e)}")
        raise

def get_device_alarms(client_id):
    """Get all alarms for a device"""
    try:
        response = alarms_table.query(
            KeyConditionExpression=Key('client_id').eq(client_id)
        )
        return response['Items']
    except Exception as e:
        print(f"Error getting alarms: {str(e)}")
        raise

def delete_alarm(client_id, alarm_id):
    """Delete an alarm"""
    try:
        alarms_table.delete_item(
            Key={
                'client_id': client_id,
                'alarm_id': alarm_id
            }
        )
        return {"message": "Alarm deleted successfully"}
    except Exception as e:
        print(f"Error deleting alarm: {str(e)}")
        raise

def check_alarms(client_id, shadow_state_from_event=None):
    """
    Check if any alarms should be triggered based on current device state
    
    Args:
        client_id: Device ID
        shadow_state_from_event: Optional shadow state from IoT Rule event (to avoid extra API call)
    """
    try:
        # Get device shadow for state parameters (IN1, IN2, OUT1, OUT2, charging, etc.)
        shadow_state = {}
        
        if shadow_state_from_event:
            # Use shadow data from IoT Rule event (already in event payload)
            shadow_state = shadow_state_from_event
            logger.info(f"Using shadow state from IoT Rule event: {list(shadow_state.keys())}")
        else:
            # Fallback: fetch shadow via API (for manual checks)
            shadow_document = get_device_shadow(client_id)
            if shadow_document and 'state' in shadow_document and 'reported' in shadow_document['state']:
                shadow_state = shadow_document['state']['reported']
        
        # Get telemetry data for metrics (battery, temperature, etc.)
        telemetry_data = {}
        state_response = device_data_table.query(
            KeyConditionExpression=Key('client_id').eq(client_id),
            ScanIndexForward=False,
            Limit=1
        )
        if state_response['Items']:
            telemetry_data = state_response['Items'][0]
        
        device_status = get_device_status(client_id)
        
        # Get all alarms for the device
        alarms = get_device_alarms(client_id)
        triggered_alarms = []
        
        for alarm in alarms:
            if not alarm.get('enabled', True):
                continue
                
            variable_name = alarm['variable_name']
            parameter_type = alarm.get('parameter_type', 'metrics')
            current_value = None
            
            # Get current value based on parameter type
            if parameter_type == 'state':
                # Read from shadow REPORTED for all state parameters
                # IN1, IN2, OUT1, OUT2, charging, motor_speed, power_saving
                current_value = shadow_state.get(variable_name)
            elif parameter_type == 'metrics':
                # Read from telemetry table for sensor metrics
                # battery, temperature, humidity, signal_quality, pressure
                current_value = telemetry_data.get(variable_name)
            else:
                logger.warning(f"Unknown parameter_type: {parameter_type}")
                continue
            
            if current_value is None:
                logger.warning(f"Alarm {alarm['alarm_id']}: Variable {variable_name} not found in shadow or telemetry")
                continue
                
            # Convert Decimal to float if needed
            if isinstance(current_value, Decimal):
                current_value = float(current_value)
            
            # Evaluate alarm condition
            should_trigger = evaluate_alarm_condition(alarm, current_value, device_status)
            
            if should_trigger:
                # Update last triggered timestamp and increment trigger count
                current_time = datetime.now(timezone.utc).isoformat()
                alarms_table.update_item(
                    Key={
                        'client_id': client_id,
                        'alarm_id': alarm['alarm_id']
                    },
                    UpdateExpression="set last_triggered = :ts, trigger_count = if_not_exists(trigger_count, :zero) + :inc",
                    ExpressionAttributeValues={
                        ':ts': current_time,
                        ':zero': 0,
                        ':inc': 1
                    }
                )
                
                # Log each trigger event
                logger.info(f"⚠️ ALARM TRIGGERED: {alarm.get('description', 'N/A')} (ID: {alarm['alarm_id']}) at {current_time}")
                
                triggered_alarms.append(alarm)
        
        return triggered_alarms
    except Exception as e:
        logger.error(f"Error checking alarms: {str(e)}")
        raise

def lambda_handler(event, context):
    """
    Lambda handler for alarm management
    Handles two event types:
    1. API Gateway requests (manual alarm management)
    2. IoT Rule triggers (automatic alarm checking on shadow updates)
    """
    try:
        logger.info("Received event: %s", json.dumps(event))
        
        # ===== IoT Rule Trigger (Shadow Update) =====
        # Check if this is an IoT Rule event from shadow updates
        if 'thingName' in event:
            client_id = event['thingName']
            logger.info(f"📡 IoT Rule triggered - checking alarms for device: {client_id}")
            
            # Extract shadow state from IoT Rule event (no need for separate API call!)
            shadow_state_from_event = event.get('reported', {})
            
            # Check alarms for this device
            triggered_alarms = check_alarms(client_id, shadow_state_from_event=shadow_state_from_event)
            
            if triggered_alarms:
                logger.info(f"⚠️ {len(triggered_alarms)} alarm(s) triggered for {client_id}!")
                # TODO: Send notifications via SNS/WebSocket
                for alarm in triggered_alarms:
                    logger.info(f"   - Alarm '{alarm.get('description', 'N/A')}' triggered (severity: {alarm.get('severity', 'info')})")
            else:
                logger.info(f"✅ No alarms triggered for {client_id}")
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'device': client_id,
                    'triggered_alarms': len(triggered_alarms),
                    'alarms': [alarm.get('alarm_id') for alarm in triggered_alarms]
                }, default=decimal_default)
            }
        
        # ===== API Gateway Request =====
        # Handle CORS preflight request
        if event.get("httpMethod") == "OPTIONS":
            return {
                'statusCode': 200,
                'headers': get_cors_headers(),
                'body': json.dumps({"message": "CORS preflight successful"})
            }
        
        # Handle both direct JSON and API Gateway events
        if 'body' in event:
            # API Gateway event
            body = json.loads(event['body'])
        else:
            # Direct JSON event
            body = event
            
        client_id = body.get('client_id')
        operation = body.get('operation')
        
        if not client_id or not operation:
            return {
                'statusCode': 400,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'error': 'Missing required parameters',
                    'success': False
                }, default=decimal_default)
            }
        
        if operation == 'create':
            alarm = body.get('alarm')
            if not alarm:
                return {
                    'statusCode': 400,
                    'headers': get_cors_headers(),
                    'body': json.dumps({
                        'error': 'Missing alarm data',
                        'success': False
                    }, default=decimal_default)
                }
            
            # Create the alarm
            alarm_data = create_alarm(client_id, alarm)
            
            return {
                'statusCode': 200,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'message': 'Alarm created successfully',
                    'success': True,
                    'alarm': alarm_data
                }, default=decimal_default)
            }
            
        elif operation == 'delete':
            alarm_id = body.get('alarm_id')
            if not alarm_id:
                return {
                    'statusCode': 400,
                    'headers': get_cors_headers(),
                    'body': json.dumps({
                        'error': 'Missing alarm_id',
                        'success': False
                    }, default=decimal_default)
                }
            
            # Delete the alarm from DynamoDB
            delete_alarm(client_id, alarm_id)
            
            return {
                'statusCode': 200,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'message': 'Alarm deleted successfully',
                    'success': True
                }, default=decimal_default)
            }
            
        elif operation == 'update':
            alarm_id = body.get('alarm_id')
            enabled = body.get('enabled')
            
            if alarm_id is None or enabled is None:
                return {
                    'statusCode': 400,
                    'headers': get_cors_headers(),
                    'body': json.dumps({
                        'error': 'Missing required parameters for update',
                        'success': False
                    }, default=decimal_default)
                }
            
            # Update the alarm in DynamoDB
            alarms_table.update_item(
                Key={
                    'client_id': client_id,
                    'alarm_id': alarm_id
                },
                UpdateExpression='SET enabled = :enabled',
                ExpressionAttributeValues={
                    ':enabled': enabled
                }
            )
            
            return {
                'statusCode': 200,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'message': 'Alarm updated successfully',
                    'success': True
                }, default=decimal_default)
            }
            
        elif operation == 'get':
            alarms = get_device_alarms(client_id)
            return {
                'statusCode': 200,
                'headers': get_cors_headers(),
                'body': json.dumps(alarms, default=decimal_default)
            }

        elif operation == 'check':
            triggered_alarms = check_alarms(client_id)
            return {
                'statusCode': 200,
                'headers': get_cors_headers(),
                'body': json.dumps(triggered_alarms, default=decimal_default)
            }

        elif operation == 'variables':
            variables = get_available_variables(client_id)
            return {
                'statusCode': 200,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    "variables": variables
                }, default=decimal_default)
            }

        else:
            return {
                'statusCode': 400,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'error': 'Invalid operation',
                    'success': False
                }, default=decimal_default)
            }
            
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'error': str(e),
                'success': False
            }, default=decimal_default)
        }
>>>>>>> dev-AWS-Connect-optimize
