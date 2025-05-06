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
device_data_table = dynamodb.Table('IoT_DeviceData')

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

def create_alarm(client_id, variable_name, threshold, condition, description):
    """Create a new alarm for a device"""
    try:
        # Verify that the variable exists
        available_variables = get_available_variables(client_id)
        if variable_name not in available_variables:
            raise ValueError(f"Variable {variable_name} is not available for this device")

        alarm = {
            'client_id': client_id,
            'alarm_id': f"{client_id}_{variable_name}_{datetime.now(timezone.utc).timestamp()}",
            'variable_name': variable_name,
            'threshold': threshold,
            'condition': condition,  # 'above' or 'below'
            'description': description,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'is_active': True,
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
    # Handle CORS preflight requests
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps({})
        }

    try:
        # Extract request data
        body = json.loads(event.get('body', '{}'))
        client_id = body.get('client_id')
        operation = body.get('operation')
        
        if not client_id or not operation:
            return {
                'statusCode': 400,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'error': 'client_id and operation are required'
                })
            }

        if operation == 'create':
            # Create new alarm
            alarm_id = f"{client_id}_{body['variable_name']}_{datetime.now(timezone.utc).timestamp()}"
            alarm = {
                'client_id': client_id,
                'alarm_id': alarm_id,
                'variable_name': body['variable_name'],
                'threshold': float(body['threshold']),
                'condition': body['condition'],
                'description': body.get('description', ''),
                'created_at': datetime.now(timezone.utc).isoformat(),
                'is_active': body.get('is_active', True),
                'last_triggered': None
            }
            
            alarms_table.put_item(Item=alarm)
            return {
                'statusCode': 200,
                'headers': get_cors_headers(),
                'body': json.dumps(alarm)
            }

        elif operation == 'delete':
            # Delete alarm
            alarm_id = body.get('alarm_id')
            if not alarm_id:
                return {
                    'statusCode': 400,
                    'headers': get_cors_headers(),
                    'body': json.dumps({
                        'error': 'alarm_id is required for delete operation'
                    })
                }
            
            alarms_table.delete_item(
                Key={
                    'client_id': client_id,
                    'alarm_id': alarm_id
                }
            )
            return {
                'statusCode': 200,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'message': 'Alarm deleted successfully'
                })
            }

        elif operation == 'update':
            # Update alarm
            alarm_id = body.get('alarm_id')
            if not alarm_id:
                return {
                    'statusCode': 400,
                    'headers': get_cors_headers(),
                    'body': json.dumps({
                        'error': 'alarm_id is required for update operation'
                    })
                }
            
            update_expression = 'SET '
            expression_values = {}
            
            if 'is_active' in body:
                update_expression += 'is_active = :is_active'
                expression_values[':is_active'] = body['is_active']
            
            if 'threshold' in body:
                if update_expression != 'SET ':
                    update_expression += ', '
                update_expression += 'threshold = :threshold'
                expression_values[':threshold'] = float(body['threshold'])
            
            if 'description' in body:
                if update_expression != 'SET ':
                    update_expression += ', '
                update_expression += 'description = :description'
                expression_values[':description'] = body['description']
            
            if not expression_values:
                return {
                    'statusCode': 400,
                    'headers': get_cors_headers(),
                    'body': json.dumps({
                        'error': 'No valid update parameters provided'
                    })
                }
            
            alarms_table.update_item(
                Key={
                    'client_id': client_id,
                    'alarm_id': alarm_id
                },
                UpdateExpression=update_expression,
                ExpressionAttributeValues=expression_values
            )
            
            return {
                'statusCode': 200,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'message': 'Alarm updated successfully'
                })
            }

        elif operation == 'get':
            alarms = get_device_alarms(client_id)
            return {
                'statusCode': 200,
                'headers': get_cors_headers(),
                'body': json.dumps(alarms)
            }

        elif operation == 'check':
            triggered_alarms = check_alarms(client_id)
            return {
                'statusCode': 200,
                'headers': get_cors_headers(),
                'body': json.dumps(triggered_alarms)
            }

        elif operation == 'variables':
            variables = get_available_variables(client_id)
            return {
                'statusCode': 200,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    "variables": variables
                })
            }

        else:
            return {
                'statusCode': 400,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'error': f'Invalid operation: {operation}'
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