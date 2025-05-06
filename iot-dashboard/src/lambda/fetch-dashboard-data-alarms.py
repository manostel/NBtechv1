import json
import boto3
import os
from datetime import datetime, timezone
from boto3.dynamodb.conditions import Key
from decimal import Decimal

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
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,DELETE',
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
                triggered_alarms.append(alarm)
        
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
    # Handle CORS preflight requests
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps({})
        }

    try:
        # Extract client_id from the request
        body = json.loads(event.get('body', '{}'))
        client_id = body.get('client_id')
        
        if not client_id:
            return {
                'statusCode': 400,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'error': 'client_id is required'
                })
            }

        # Query alarms for the device
        response = alarms_table.query(
            KeyConditionExpression=Key('client_id').eq(client_id)
        )
        
        alarms = response.get('Items', [])
        
        # Get current device state to check for triggered alarms
        device_state = get_device_state(client_id)
        triggered_alarms = []
        
        if device_state:
            for alarm in alarms:
                if alarm.get('is_active', True):
                    variable_value = device_state.get(alarm['variable_name'])
                    if variable_value is not None:
                        if alarm['condition'] == 'above' and variable_value > alarm['threshold']:
                            triggered_alarms.append(alarm)
                        elif alarm['condition'] == 'below' and variable_value < alarm['threshold']:
                            triggered_alarms.append(alarm)

        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'client_id': client_id,
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'alarms': alarms,
                'triggered_alarms': triggered_alarms
            })
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'error': str(e)
            })
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