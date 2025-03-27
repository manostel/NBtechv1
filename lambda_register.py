import json
import boto3
from boto3.dynamodb.conditions import Key
import bcrypt
from datetime import datetime

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
users_table = dynamodb.Table('IoT_Users')

def lambda_handler(event, context):
    debug_logs = []
    debug_logs.append(f"Received event: {json.dumps(event)}")
    
    try:
        # Parse body
        body = json.loads(event.get('body', '{}'))
        
        # Validate required fields
        required_fields = ['email', 'password', 'client_id']
        for field in required_fields:
            if field not in body:
                return cors_response(400, {
                    'error': f'Missing required field: {field}',
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
        
        # Hash password
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(body['password'].encode('utf-8'), salt)
        
        # Store user
        new_user = {
            'email': body['email'],
            'password_hash': hashed_password.decode('utf-8'),
            'client_id': body['client_id'],
            'created_at': str(datetime.now()),
            'auth_type': body.get('auth_type', 'email')
        }
        
        users_table.put_item(Item=new_user)
        
        return cors_response(200, {
            'message': 'User registered successfully',
            'email': body['email'],
            'client_id': body['client_id']
        })
        
    except Exception as e:
        debug_logs.append(f"Error: {str(e)}")
        return cors_response(500, {
            'error': str(e),
            'debug_logs': debug_logs
        }) 