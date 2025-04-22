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
            'Access-Control-Allow-Origin': 'http://localhost:3000',
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
        # Get the request data either from body or directly from event
        if 'body' in event:
            try:
                body = json.loads(event['body'])
            except json.JSONDecodeError:
                body = event['body']
        else:
            body = event
            
        debug_logs.append(f"Parsed body: {json.dumps(body)}")
        
        # Validate required fields
        required_fields = ['email', 'password', 'action']
        missing_fields = [field for field in required_fields if field not in body]
        if missing_fields:
            return cors_response(400, {
                'error': f'Missing required fields: {", ".join(missing_fields)}',
                'debug_logs': debug_logs
            })
        
        # Validate action
        if body.get('action') != 'register':
            return cors_response(400, {
                'error': 'Invalid action',
                'debug_logs': debug_logs
            })
        
        # Check if user already exists
        existing_user = users_table.get_item(
            Key={'email': body['email']}
        ).get('Item')
        
        if existing_user:
            return cors_response(409, {
                'error': 'User already exists',
                'debug_logs': debug_logs
            })
        
        # Create new user
        new_user = {
            'email': body['email'],
            'password': body['password'],
            'auth_type': body.get('auth_type', 'email')
        }
        
        # Save to DynamoDB
        users_table.put_item(Item=new_user)
        
        # Return success response
        return cors_response(200, {
            'message': 'Registration successful',
            'email': new_user['email'],
            'auth_type': new_user['auth_type']
        })
        
    except Exception as e:
        debug_logs.append(f"Error: {str(e)}")
        return cors_response(500, {
            'error': str(e),
            'debug_logs': debug_logs
        })