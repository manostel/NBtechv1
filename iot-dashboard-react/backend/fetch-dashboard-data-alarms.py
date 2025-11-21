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
        state_response = device_states_table.query(
            KeyConditionExpression=Key('client_id').eq(client_id),
            ScanIndexForward=False,
            Limit=1
        )
        
        if not state_response['Items']:
            return []
        
        current_state = state_response['Items'][0]
        
        # Get all alarms for the device
        alarms = get_device_alarms(client_id)
        triggered_alarms = []
        
        for alarm in alarms:
            if not alarm['is_active']:
                continue
                
            variable_name = alarm['variable_name']
            if variable_name not in current_state:
                continue
                
            value = current_state[variable_name]
            if isinstance(value, Decimal):
                value = float(value)
            
            should_trigger = False
            if alarm['condition'] == 'above' and value > alarm['threshold']:
                should_trigger = True
            elif alarm['condition'] == 'below' and value < alarm['threshold']:
                should_trigger = True
            
            if should_trigger:
                # Include severity in triggered alarm
                triggered_alarm = {
                    **alarm,
                    'current_value': value,
                    'severity': alarm.get('severity', 'info')
                }
                triggered_alarms.append(triggered_alarm)
        
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
        
        # Query DynamoDB for alarms
        response = alarms_table.query(
            KeyConditionExpression='client_id = :cid',
            ExpressionAttributeValues={
                ':cid': client_id
            }
        )
        
        alarms = response.get('Items', [])
        
        # Get current device state to check for triggered alarms
        device_table = dynamodb.Table('IoT_DeviceData')
        device_response = device_table.query(
            KeyConditionExpression='client_id = :cid',
            ExpressionAttributeValues={
                ':cid': client_id
            },
            ScanIndexForward=False,  # Get most recent first
            Limit=1  # Get only the latest state
        )
        
        current_state = device_response.get('Items', [{}])[0] if device_response.get('Items') else {}
        triggered_alarms = []
        
        # Check which alarms are triggered
        for alarm in alarms:
            if not alarm.get('enabled', True):
                continue
                
            variable_name = alarm.get('variable_name')
            condition = alarm.get('condition')
            threshold = float(alarm.get('threshold', 0))
            current_value = float(current_state.get(variable_name, 0))
            
            is_triggered = False
            if condition == 'above' and current_value > threshold:
                is_triggered = True
            elif condition == 'below' and current_value < threshold:
                is_triggered = True
                
            if is_triggered:
                # Update the last_triggered timestamp in the database
                try:
                    alarms_table.update_item(
                        Key={
                            'client_id': client_id,
                            'alarm_id': alarm['alarm_id']
                        },
                        UpdateExpression='SET last_triggered = :ts',
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
        
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'client_id': client_id,
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'alarms': alarms,
                'triggered_alarms': triggered_alarms
            }, default=decimal_default)
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

def get_device_state(client_id):
    try:
        # Get the latest state from DynamoDB
        state_table = dynamodb.Table('IoT_DeviceState')
        response = state_table.query(
            KeyConditionExpression=Key('client_id').eq(client_id),
            ScanIndexForward=False,
            Limit=1
        )
        
        items = response.get('Items', [])
        if items:
            return items[0]
        return None
    except Exception as e:
        print(f"Error getting device state: {str(e)}")
        return None 