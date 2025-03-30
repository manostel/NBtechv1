import json
import boto3
from datetime import datetime
from decimal import Decimal

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
device_preferences_table = dynamodb.Table('IoT_DevicePreferences')

def cors_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
            'Access-Control-Allow-Credentials': 'true'
        },
        'body': json.dumps(body)
    }

def decimal_to_float(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    return obj

def lambda_handler(event, context):
    debug_logs = []
    debug_logs.append(f"Received event: {json.dumps(event)}")
    
    # Handle OPTIONS request for CORS
    if event.get('httpMethod') == 'OPTIONS':
        return cors_response(200, {})
    
    try:
        # Parse body
        body = event.get('body')
        if body is None:
            body = event
        elif isinstance(body, str):
            body = json.loads(body)
        
        debug_logs.append(f"Parsed body: {json.dumps(body)}")
        
        # Get action from body
        action = body.get('action')
        debug_logs.append(f"Action: {action}")
        
        if not action:
            return cors_response(400, {
                'error': 'Missing action in request body',
                'debug_logs': debug_logs
            })
        
        if action == 'get_preferences':
            # Validate required fields
            required_fields = ['user_email']
            for field in required_fields:
                if field not in body:
                    return cors_response(400, {
                        'error': f'Missing required field: {field}',
                        'debug_logs': debug_logs
                    })
            
            # Get all preferences for the user
            response = device_preferences_table.query(
                KeyConditionExpression='user_email = :user_email',
                ExpressionAttributeValues={
                    ':user_email': body['user_email']
                }
            )
            
            debug_logs.append(f"DynamoDB response: {json.dumps(response, default=decimal_to_float)}")
            
            return cors_response(200, {
                'preferences': response.get('Items', [])
            })
            
        elif action == 'get_device_preferences':
            # Validate required fields
            required_fields = ['user_email', 'client_id']
            for field in required_fields:
                if field not in body:
                    return cors_response(400, {
                        'error': f'Missing required field: {field}',
                        'debug_logs': debug_logs
                    })
            
            # Get preferences for a specific device
            response = device_preferences_table.get_item(
                Key={
                    'user_email': body['user_email'],
                    'client_id': body['client_id']
                }
            )
            
            debug_logs.append(f"DynamoDB response: {json.dumps(response, default=decimal_to_float)}")
            
            return cors_response(200, {
                'preferences': response.get('Item', {
                    'metrics_visibility': {
                        'temperature': True,
                        'humidity': True
                    },
                    'display_order': 0
                })
            })
            
        elif action == 'update_preferences':
            # Validate required fields
            required_fields = ['user_email', 'client_id']
            for field in required_fields:
                if field not in body:
                    return cors_response(400, {
                        'error': f'Missing required field: {field}',
                        'debug_logs': debug_logs
                    })
            
            # Update preferences
            preferences = {
                'user_email': body['user_email'],
                'client_id': body['client_id'],
                'device_name': body.get('device_name', 'Unknown'),
                'metrics_visibility': body.get('metrics_visibility', {
                    'temperature': True,
                    'humidity': True
                }),
                'display_order': body.get('display_order', 0)
            }
            
            # Save preferences
            device_preferences_table.put_item(Item=preferences)
            
            return cors_response(200, {
                'message': 'Device preferences updated successfully',
                'preferences': preferences
            })
            
        elif action == 'delete_preferences':
            # Validate required fields
            required_fields = ['user_email', 'client_id']
            for field in required_fields:
                if field not in body:
                    return cors_response(400, {
                        'error': f'Missing required field: {field}',
                        'debug_logs': debug_logs
                    })
            
            # Delete preferences
            device_preferences_table.delete_item(
                Key={
                    'user_email': body['user_email'],
                    'client_id': body['client_id']
                }
            )
            
            return cors_response(200, {
                'message': 'Device preferences deleted successfully'
            })
            
        else:
            return cors_response(400, {
                'error': f'Invalid action: {action}',
                'debug_logs': debug_logs
            })
        
    except Exception as e:
        debug_logs.append(f"Error: {str(e)}")
        return cors_response(500, {
            'error': str(e),
            'debug_logs': debug_logs
        }) 