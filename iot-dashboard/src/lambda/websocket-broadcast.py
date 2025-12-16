import json
import boto3
import os

dynamodb = boto3.resource('dynamodb')
connections_table = dynamodb.Table(os.environ.get('CONNECTIONS_TABLE', 'WebSocketConnections'))

def lambda_handler(event, context):
    """
    Broadcast device state updates to connected WebSocket clients.
    Triggered by AWS IoT Rule when device shadow is updated.
    """
    print("📨 Received event:", json.dumps(event, indent=2))
    
    # Get WebSocket API endpoint from environment
    websocket_endpoint = os.environ.get('WEBSOCKET_ENDPOINT')
    if not websocket_endpoint:
        print("❌ WEBSOCKET_ENDPOINT not configured")
        return {'statusCode': 500, 'body': 'WebSocket endpoint not configured'}
    
    # Parse the incoming IoT event
    # Event comes from IoT Rule with shadow update data
    try:
        # Extract client_id and state from the IoT event
        # Format depends on IoT Rule SQL: SELECT * FROM '$aws/things/+/shadow/update/documents'
        client_id = event.get('thingName') or event.get('client_id')
        
        # Get state from shadow document
        current = event.get('current', {})
        state = current.get('state', {})
        reported = state.get('reported', {})
        desired = state.get('desired', {})
        
        if not client_id:
            print("⚠️ No client_id in event")
            return {'statusCode': 400, 'body': 'Missing client_id'}
        
        # Build the message to send to frontend
        message = {
            'type': 'SHADOW_UPDATE',
            'client_id': client_id,
            'timestamp': event.get('timestamp', 0),
            'reported': {
                'out1_state': reported.get('OUT1', 0),
                'out2_state': reported.get('OUT2', 0),
                'motor_speed': reported.get('motor_speed', 0),
                'power_saving': reported.get('power_saving', 0),
                'in1_state': reported.get('IN1', 0),
                'in2_state': reported.get('IN2', 0),
                'charging': reported.get('charging', 0),
                'connection_status': reported.get('connection_status', 'unknown')
            },
            'desired': {
                'out1_state': desired.get('OUT1'),
                'out2_state': desired.get('OUT2'),
                'motor_speed': desired.get('motor_speed'),
                'power_saving': desired.get('power_saving')
            }
        }
        
    except Exception as e:
        print(f"❌ Error parsing event: {str(e)}")
        return {'statusCode': 400, 'body': f'Invalid event format: {str(e)}'}
    
    # Get all connected clients (or filter by client_id)
    try:
        # Scan for all connections or filter by client_id
        response = connections_table.scan()
        connections = response.get('Items', [])
        
        # Filter connections that want this client_id's updates
        relevant_connections = [
            c for c in connections 
            if c.get('client_id') in ['all', client_id]
        ]
        
        print(f"📡 Broadcasting to {len(relevant_connections)} connections")
        
    except Exception as e:
        print(f"❌ Error scanning connections: {str(e)}")
        return {'statusCode': 500, 'body': f'Failed to get connections: {str(e)}'}
    
    # Create API Gateway Management API client
    apigw_management = boto3.client(
        'apigatewaymanagementapi',
        endpoint_url=websocket_endpoint
    )
    
    # Send message to each connected client
    stale_connections = []
    for connection in relevant_connections:
        connection_id = connection['connectionId']
        try:
            apigw_management.post_to_connection(
                ConnectionId=connection_id,
                Data=json.dumps(message).encode('utf-8')
            )
            print(f"✅ Sent to {connection_id}")
        except apigw_management.exceptions.GoneException:
            # Connection is stale, mark for deletion
            stale_connections.append(connection_id)
            print(f"⚠️ Stale connection: {connection_id}")
        except Exception as e:
            print(f"❌ Error sending to {connection_id}: {str(e)}")
    
    # Clean up stale connections
    for connection_id in stale_connections:
        try:
            connections_table.delete_item(Key={'connectionId': connection_id})
        except Exception as e:
            print(f"❌ Error deleting stale connection {connection_id}: {str(e)}")
    
    return {
        'statusCode': 200,
        'body': f'Broadcast to {len(relevant_connections)} clients'
    }

