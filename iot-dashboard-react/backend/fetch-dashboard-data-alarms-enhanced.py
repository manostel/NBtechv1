import json
import boto3
import logging
from datetime import datetime, timezone, timedelta
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

# Add this helper function to handle Decimal serialization
def decimal_default(obj):
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError

def get_cors_headers():
    """Return CORS headers for the response"""
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST',
        'Content-Type': 'application/json'
    }

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

def get_device_alarms(client_id):
    """Get all alarms for a device"""
    try:
        response = alarms_table.query(
            KeyConditionExpression=Key('client_id').eq(client_id)
        )
        return response['Items']
    except Exception as e:
        print(f"Error getting alarms: {str(e)}")
        return []

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
                try:
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
                except Exception as e:
                    logger.warning(f"Failed to update last_triggered for alarm {alarm['alarm_id']}: {str(e)}")
                
                triggered_alarms.append({
                    **alarm,
                    'current_value': current_value,
                    'severity': alarm.get('severity', 'info'),
                    'last_triggered': datetime.now(timezone.utc).isoformat()
                })
        
        return triggered_alarms
    except Exception as e:
        print(f"Error checking alarms: {str(e)}")
        return []

def get_alarms_data(client_id):
    """Get all alarms and triggered alarms for a device"""
    try:
        # Get all alarms
        alarms = get_device_alarms(client_id)
        
        # Get triggered alarms
        triggered_alarms = check_alarms(client_id)
        
        return {
            'client_id': client_id,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'alarms': alarms,
            'triggered_alarms': triggered_alarms
        }

    except Exception as e:
        print(f"Error getting alarms data: {str(e)}")
        return None

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
        
        if not client_id:
            return {
                'statusCode': 400,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'error': 'Missing client_id parameter',
                    'alarms': [],
                    'triggered_alarms': []
                })
            }
        
        # Get alarms data using the enhanced functions
        alarms_data = get_alarms_data(client_id)
        
        if alarms_data is None:
            return {
                'statusCode': 500,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'error': 'Failed to fetch alarms data',
                    'alarms': [],
                    'triggered_alarms': []
                })
            }
        
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps(alarms_data, default=decimal_default)
        }
        
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'error': str(e),
                'alarms': [],
                'triggered_alarms': []
            }, default=decimal_default)
        }
