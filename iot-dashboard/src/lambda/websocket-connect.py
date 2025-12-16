import json
import boto3
import os

dynamodb = boto3.resource('dynamodb')
connections_table = dynamodb.Table(os.environ.get('CONNECTIONS_TABLE', 'WebSocketConnections'))

def lambda_handler(event, context):
    """Handle WebSocket $connect"""
    connection_id = event['requestContext']['connectionId']
    
    # Get client_id from query string (optional - for filtering)
    query_params = event.get('queryStringParameters') or {}
    client_id = query_params.get('client_id', 'all')
    
    try:
        connections_table.put_item(
            Item={
                'connectionId': connection_id,
                'client_id': client_id,
                'timestamp': int(event['requestContext']['requestTimeEpoch'])
            }
        )
        print(f"✅ Connected: {connection_id} for client_id: {client_id}")
        return {'statusCode': 200, 'body': 'Connected'}
    except Exception as e:
        print(f"❌ Error connecting: {str(e)}")
        return {'statusCode': 500, 'body': f'Failed to connect: {str(e)}'}

