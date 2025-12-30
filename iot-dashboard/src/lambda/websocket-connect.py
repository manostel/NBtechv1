import json
import boto3
import os
import time

dynamodb = boto3.resource('dynamodb')
connections_table = dynamodb.Table(os.environ.get('CONNECTIONS_TABLE', 'WebSocketConnections'))

def lambda_handler(event, context):
    """Handle WebSocket $connect"""
    connection_id = event['requestContext']['connectionId']
    
    # Get user_email and optional client_id from query string
    query_params = event.get('queryStringParameters') or {}
    user_email = query_params.get('user_email')
    client_id = query_params.get('client_id')  # Optional: specific device, or None for all user's devices
    
    # Validate user_email is provided (security requirement)
    if not user_email:
        print(f"❌ Connection rejected: No user_email provided")
        return {'statusCode': 403, 'body': 'Forbidden: user_email required'}
    
    try:
        # Calculate TTL: 24 hours from now (in Unix timestamp seconds)
        # DynamoDB TTL requires Unix timestamp in SECONDS, not milliseconds
        ttl_seconds = int(time.time()) + (24 * 60 * 60)  # 24 hours
        
        item = {
            'connectionId': connection_id,
            'user_email': user_email,
            'timestamp': int(event['requestContext']['requestTimeEpoch']),  # Keep for reference (milliseconds)
            'ttl': ttl_seconds  # TTL field for automatic cleanup (seconds)
        }
        
        # Optionally store specific client_id if provided (for Dashboard single-device view)
        if client_id:
            item['client_id'] = client_id
        
        connections_table.put_item(Item=item)
        
        print(f"✅ Connected: {connection_id} for user: {user_email}" + (f", device: {client_id}" if client_id else " (all devices)") + f" (TTL: {ttl_seconds})")
        return {'statusCode': 200, 'body': 'Connected'}
    except Exception as e:
        print(f"❌ Error connecting: {str(e)}")
        return {'statusCode': 500, 'body': f'Failed to connect: {str(e)}'}

