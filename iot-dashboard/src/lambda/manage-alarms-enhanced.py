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

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
alarms_table = dynamodb.Table('IoT_DeviceAlarms')
device_states_table = dynamodb.Table('IoT_DeviceStatus')
device_data_table = dynamodb.Table('IoT_DeviceData')

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
    """Get current device status (Online/Offline)"""
    try:
        # Get latest device data
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
            
        # Check if device is online (within last 7 minutes)
        from datetime import datetime, timezone, timedelta
        try:
            if isinstance(timestamp, str):
                # Parse ISO format timestamp
                last_update = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            else:
                last_update = timestamp
                
            now = datetime.now(timezone.utc)
            time_diff = now - last_update
            
            # Device is online if last update was within 7 minutes
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
        
        # Handle status alarms
        if variable_name == 'status':
            if device_status is None:
                device_status = get_device_status(alarm['client_id'])
            
            if condition == 'equals':
                return device_status == threshold
            elif condition == 'not_equals':
                return device_status != threshold
            else:
                return False
        
        # Handle numeric conditions
        if condition == 'above':
            return current_value > threshold
        elif condition == 'below':
            return current_value < threshold
        elif condition == 'equals':
            return current_value == threshold
        elif condition == 'not_equals':
            return current_value != threshold
        else:
            return False
            
    except Exception as e:
        print(f"Error evaluating alarm condition: {str(e)}")
        return False

def create_alarm(client_id, alarm_data):
    """Create a new alarm for a device"""
    try:
        variable_name = alarm_data['variable_name']
        parameter_type = alarm_data.get('parameter_type', 'metrics')
        
        # Validate parameter based on type
        if parameter_type == 'status':
            if variable_name != 'status':
                raise ValueError(f"Status alarms must use 'status' variable")
        elif parameter_type == 'inputs':
            if not variable_name.startswith('inputs.'):
                raise ValueError(f"Input alarms must use 'inputs.' prefix")
        elif parameter_type == 'outputs':
            if not variable_name.startswith('outputs.'):
                raise ValueError(f"Output alarms must use 'outputs.' prefix")
        
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

def check_alarms(client_id):
    """Check if any alarms should be triggered based on current device state"""
    try:
        # Get current device state
        state_response = device_data_table.query(
            KeyConditionExpression=Key('client_id').eq(client_id),
            ScanIndexForward=False,
            Limit=1
        )
        
        if not state_response['Items']:
            return []
        
        current_state = state_response['Items'][0]
        device_status = get_device_status(client_id)
        
        # Get all alarms for the device
        alarms = get_device_alarms(client_id)
        triggered_alarms = []
        
        for alarm in alarms:
            if not alarm.get('enabled', True):
                continue
                
            variable_name = alarm['variable_name']
            current_value = None
            
            # Get current value based on variable type
            if variable_name == 'status':
                current_value = device_status
            elif '.' in variable_name:
                # Handle nested values (inputs.IN1, outputs.OUT1, etc.)
                current_value = get_nested_value(current_state, variable_name)
            else:
                # Handle direct values (battery, temperature, etc.)
                current_value = current_state.get(variable_name)
            
            if current_value is None:
                continue
                
            # Convert Decimal to float if needed
            if isinstance(current_value, Decimal):
                current_value = float(current_value)
            
            # Evaluate alarm condition
            should_trigger = evaluate_alarm_condition(alarm, current_value, device_status)
            
            if should_trigger:
                # Update last triggered timestamp
                alarms_table.update_item(
                    Key={
                        'client_id': client_id,
                        'alarm_id': alarm['alarm_id']
                    },
                    UpdateExpression="set last_triggered = :ts",
                    ExpressionAttributeValues={
                        ':ts': datetime.now(timezone.utc).isoformat()
                    }
                )
                triggered_alarms.append(alarm)
        
        return triggered_alarms
    except Exception as e:
        print(f"Error checking alarms: {str(e)}")
        raise

def lambda_handler(event, context):
    try:
        logger.info("Received event: %s", json.dumps(event))
        
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
