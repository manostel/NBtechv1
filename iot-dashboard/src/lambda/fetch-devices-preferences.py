import json
import boto3
import logging
from decimal import Decimal

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB client
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
        'body': json.dumps(body, default=decimal_to_float)
    }

def decimal_to_float(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def lambda_handler(event, context):
    try:
        # Log the received event
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Parse the request body
        body = json.loads(event['body'])
        logger.info(f"Parsed body: {json.dumps(body)}")
        
        action = body.get('action')
        logger.info(f"Action: {action}")
        
        if action == 'get_device_preferences':
            user_email = body.get('user_email')
            client_id = body.get('client_id')
            
            if not user_email or not client_id:
                return cors_response(400, {
                    'error': 'Missing required parameters',
                    'debug_logs': []
                })
            
            try:
                response = device_preferences_table.get_item(
                    Key={
                        'user_email': user_email,
                        'client_id': client_id
                    }
                )
                
                logger.info(f"DynamoDB response: {json.dumps(response, default=decimal_to_float)}")
                
                if 'Item' not in response:
                    # Create default preferences if none exist
                    default_preferences = {
                        'user_email': user_email,
                        'client_id': client_id,
                        'device_name': 'Unknown',
                        'metrics_visibility': {
                            'temperature': True,
                            'humidity': True,
                            'created_at': False,
                            'last_seen': True,
                            'status': True
                        },
                        'display_order': Decimal('0')
                    }
                    
                    device_preferences_table.put_item(Item=default_preferences)
                    return cors_response(200, {
                        'preferences': default_preferences
                    })
                
                # Convert DynamoDB response to regular Python dict
                item = response['Item']
                preferences = {
                    'user_email': item['user_email'],
                    'client_id': item['client_id'],
                    'device_name': item.get('device_name', 'Unknown'),
                    'metrics_visibility': item.get('metrics_visibility', {
                        'temperature': True,
                        'humidity': True,
                        'created_at': False,
                        'last_seen': True,
                        'status': True
                    }),
                    'display_order': item.get('display_order', Decimal('0'))
                }
                
                return cors_response(200, {
                    'preferences': preferences
                })
                
            except Exception as e:
                logger.error(f"DynamoDB get_item error: {str(e)}")
                return cors_response(500, {
                    'error': f'Error getting device preferences: {str(e)}',
                    'debug_logs': []
                })
                
        elif action == 'update_preferences':
            user_email = body.get('user_email')
            client_id = body.get('client_id')
            device_name = body.get('device_name')
            metrics_visibility = body.get('metrics_visibility', {})
            display_order = body.get('display_order', 0)
            
            if not user_email or not client_id:
                return cors_response(400, {
                    'error': 'Missing required parameters',
                    'debug_logs': []
                })
            
            try:
                # Convert display_order to Decimal for DynamoDB
                display_order_decimal = Decimal(str(display_order))
                
                # Ensure all required metrics are present
                default_metrics = {
                    'temperature': True,
                    'humidity': True,
                    'created_at': False,
                    'last_seen': True,
                    'status': True
                }
                
                # Merge provided metrics with defaults
                metrics_visibility = {**default_metrics, **metrics_visibility}
                
                response = device_preferences_table.put_item(
                    Item={
                        'user_email': user_email,
                        'client_id': client_id,
                        'device_name': device_name,
                        'metrics_visibility': metrics_visibility,
                        'display_order': display_order_decimal
                    }
                )
                
                return cors_response(200, {
                    'message': 'Preferences updated successfully'
                })
                
            except Exception as e:
                logger.error(f"DynamoDB put_item error: {str(e)}")
                return cors_response(500, {
                    'error': f'Error updating device preferences: {str(e)}',
                    'debug_logs': []
                })
                
        elif action == 'get_preferences':
            # Validate required fields
            required_fields = ['user_email']
            for field in required_fields:
                if field not in body:
                    return cors_response(400, {
                        'error': f'Missing required field: {field}',
                        'debug_logs': []
                    })
            
            try:
                # Get all preferences for the user
                response = device_preferences_table.query(
                    KeyConditionExpression='user_email = :user_email',
                    ExpressionAttributeValues={
                        ':user_email': body['user_email']
                    }
                )
                
                # Convert Decimal types to float in the response
                items = []
                for item in response.get('Items', []):
                    converted_item = {
                        'user_email': item['user_email'],
                        'client_id': item['client_id'],
                        'device_name': item.get('device_name', 'Unknown'),
                        'metrics_visibility': item.get('metrics_visibility', {
                            'temperature': True,
                            'humidity': True,
                            'created_at': False,
                            'last_seen': True,
                            'status': True
                        }),
                        'display_order': item.get('display_order', Decimal('0'))
                    }
                    items.append(converted_item)
                
                return cors_response(200, {
                    'preferences': items
                })
            except Exception as e:
                logger.error(f"DynamoDB query error: {str(e)}")
                return cors_response(500, {
                    'error': f'Error querying preferences: {str(e)}',
                    'debug_logs': []
                })
            
        elif action == 'delete_preferences':
            # Validate required fields
            required_fields = ['user_email', 'client_id']
            for field in required_fields:
                if field not in body:
                    return cors_response(400, {
                        'error': f'Missing required field: {field}',
                        'debug_logs': []
                    })
            
            try:
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
            except Exception as e:
                logger.error(f"DynamoDB delete_item error: {str(e)}")
                return cors_response(500, {
                    'error': f'Error deleting preferences: {str(e)}',
                    'debug_logs': []
                })
            
        else:
            return cors_response(400, {
                'error': f'Invalid action: {action}',
                'debug_logs': []
            })
        
    except json.JSONDecodeError:
        return cors_response(400, {
            'error': 'Invalid JSON in request body',
            'debug_logs': []
        })
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return cors_response(500, {
            'error': f'Internal server error: {str(e)}',
            'debug_logs': []
        }) 