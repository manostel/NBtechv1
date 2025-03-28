import json
import boto3
from boto3.dynamodb.conditions import Key
from datetime import datetime

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
devices_table = dynamodb.Table('Devices')

def cors_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',  # Allow all origins during development
            'Access-Control-Allow-Headers': '*',  # Allow all headers
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
            'Access-Control-Allow-Credentials': 'true'
        },
        'body': json.dumps(body)
    }

def lambda_handler(event, context):
    debug_logs = []
    debug_logs.append(f"Received event: {json.dumps(event)}")
    
    # Handle OPTIONS request for CORS
    if event.get('httpMethod') == 'OPTIONS':
        return cors_response(200, {})
    
    try:
        # Parse body
        body = json.loads(event.get('body', '{}'))
        debug_logs.append(f"Parsed body: {json.dumps(body)}")
        
        # Get action from body instead of query parameters
        action = body.get('action')
        
        if action == 'add_device':
            # Validate required fields
            required_fields = ['user_email', 'client_id', 'device_name']
            for field in required_fields:
                if field not in body:
                    return cors_response(400, {
                        'error': f'Missing required field: {field}',
                        'debug_logs': debug_logs
                    })
            
            # Check if device already exists
            existing_device = devices_table.get_item(
                Key={
                    'user_email': body['user_email'],
                    'client_id': body['client_id']
                }
            ).get('Item')
            
            if existing_device:
                return cors_response(409, {
                    'error': 'Device already exists',
                    'debug_logs': debug_logs
                })
            
            # Create new device
            new_device = {
                'user_email': body['user_email'],
                'client_id': body['client_id'],
                'device_name': body['device_name'],
                'status': 'Active',
                'last_seen': datetime.utcnow().isoformat(),
                'created_at': datetime.utcnow().isoformat()
            }
            
            # Save to DynamoDB
            devices_table.put_item(Item=new_device)
            
            return cors_response(200, {
                'message': 'Device added successfully',
                'device': new_device
            })
            
        elif action == 'delete_device':
            # Validate required fields
            required_fields = ['user_email', 'client_id']
            for field in required_fields:
                if field not in body:
                    return cors_response(400, {
                        'error': f'Missing required field: {field}',
                        'debug_logs': debug_logs
                    })
            
            # Delete the device
            try:
                devices_table.delete_item(
                    Key={
                        'user_email': body['user_email'],
                        'client_id': body['client_id']
                    }
                )
                return cors_response(200, {
                    'message': 'Device deleted successfully'
                })
            except Exception as e:
                return cors_response(500, {
                    'error': f'Failed to delete device: {str(e)}',
                    'debug_logs': debug_logs
                })
            
        elif action == 'get_devices':
            # Get user_email from body
            user_email = body.get('user_email')
            if not user_email:
                return cors_response(400, {
                    'error': 'Missing user_email in request body',
                    'debug_logs': debug_logs
                })
            
            # Get all devices for the user
            response = devices_table.query(
                KeyConditionExpression='user_email = :email',
                ExpressionAttributeValues={
                    ':email': user_email
                }
            )
            
            return cors_response(200, {
                'devices': response.get('Items', [])
            })

        elif action == 'update_device':
            # Validate required fields
            required_fields = ['user_email', 'old_client_id', 'new_client_id', 'device_name']
            for field in required_fields:
                if field not in body:
                    return cors_response(400, {
                        'error': f'Missing required field: {field}',
                        'debug_logs': debug_logs
                    })

            # Check if the new client_id already exists (if it's different from the old one)
            if body['old_client_id'] != body['new_client_id']:
                existing_device = devices_table.get_item(
                    Key={
                        'user_email': body['user_email'],
                        'client_id': body['new_client_id']
                    }
                ).get('Item')
                
                if existing_device:
                    return cors_response(409, {
                        'error': 'A device with the new client ID already exists',
                        'debug_logs': debug_logs
                    })

            # Get the existing device
            existing_device = devices_table.get_item(
                Key={
                    'user_email': body['user_email'],
                    'client_id': body['old_client_id']
                }
            ).get('Item')

            if not existing_device:
                return cors_response(404, {
                    'error': 'Device not found',
                    'debug_logs': debug_logs
                })

            # Update the device
            updated_device = {
                'user_email': body['user_email'],
                'client_id': body['new_client_id'],
                'device_name': body['device_name'],
                'status': existing_device.get('status', 'Active'),
                'last_seen': existing_device.get('last_seen', datetime.utcnow().isoformat()),
                'created_at': existing_device.get('created_at', datetime.utcnow().isoformat())
            }

            # If the client_id is changing, we need to delete the old record and create a new one
            if body['old_client_id'] != body['new_client_id']:
                devices_table.delete_item(
                    Key={
                        'user_email': body['user_email'],
                        'client_id': body['old_client_id']
                    }
                )
                devices_table.put_item(Item=updated_device)
            else:
                # If only the device name is changing, we can update in place
                devices_table.update_item(
                    Key={
                        'user_email': body['user_email'],
                        'client_id': body['old_client_id']
                    },
                    UpdateExpression='SET device_name = :name',
                    ExpressionAttributeValues={
                        ':name': body['device_name']
                    }
                )

            return cors_response(200, {
                'message': 'Device updated successfully',
                'device': updated_device
            })
            
        else:
            return cors_response(400, {
                'error': 'Invalid action',
                'debug_logs': debug_logs
            })
        
    except Exception as e:
        debug_logs.append(f"Error: {str(e)}")
        return cors_response(500, {
            'error': str(e),
            'debug_logs': debug_logs
        }) 