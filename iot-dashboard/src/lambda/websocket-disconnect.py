import json
import boto3
import os

dynamodb = boto3.resource('dynamodb')
connections_table = dynamodb.Table(os.environ.get('CONNECTIONS_TABLE', 'WebSocketConnections'))

def lambda_handler(event, context):
    """Handle WebSocket $disconnect"""
    connection_id = event['requestContext']['connectionId']
    
    try:
        connections_table.delete_item(
            Key={'connectionId': connection_id}
        )
        print(f"✅ Disconnected: {connection_id}")
        return {'statusCode': 200, 'body': 'Disconnected'}
    except Exception as e:
        print(f"❌ Error disconnecting: {str(e)}")
        return {'statusCode': 500, 'body': f'Failed to disconnect: {str(e)}'}

