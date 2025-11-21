import json
import boto3
from boto3.dynamodb.conditions import Key

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
users_table = dynamodb.Table('Users')

def cors_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Accept',
            'Access-Control-Allow-Methods': 'POST,OPTIONS'
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
        
        # Log the exact values we're checking
        debug_logs.append(f"Email: {body.get('email')}")
        debug_logs.append(f"Action: {body.get('action')}")
        
        # Validate required fields
        required_fields = ['email', 'password', 'action']
        for field in required_fields:
            if field not in body:
                return cors_response(400, {
                    'error': f'Missing required field: {field}',
                    'debug_logs': debug_logs
                })
        
        # Validate action
        if body.get('action') != 'login':
            return cors_response(400, {
                'error': 'Invalid action',
                'debug_logs': debug_logs
            })
        
        # Get user from database
        try:
            user_response = users_table.get_item(
                Key={'email': body['email']}
            )
            debug_logs.append(f"DynamoDB response: {json.dumps(user_response)}")
            
            user = user_response.get('Item')
            debug_logs.append(f"Found user: {json.dumps(user) if user else 'None'}")
        except Exception as db_error:
            debug_logs.append(f"DynamoDB error: {str(db_error)}")
            return cors_response(500, {
                'error': 'Database error',
                'debug_logs': debug_logs
            })
        
        if not user:
            return cors_response(401, {
                'error': 'Invalid credentials',
                'debug_logs': debug_logs
            })
        
        # Simple password check
        if user['password'] != body['password']:
            debug_logs.append("Password mismatch")
            return cors_response(401, {
                'error': 'Invalid credentials',
                'debug_logs': debug_logs
            })
        
        # Successful login response
        response_data = {
            'email': user['email'],
            'auth_type': user.get('auth_type', 'email')
        }
        
        # Only include client_id if it exists
        if 'client_id' in user:
            response_data['client_id'] = user['client_id']
        
        return cors_response(200, response_data)
        
    except Exception as e:
        debug_logs.append(f"Error: {str(e)}")
        return cors_response(500, {
            'error': str(e),
            'debug_logs': debug_logs
        })