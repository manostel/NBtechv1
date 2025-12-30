import json
import boto3
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

dynamodb = boto3.resource('dynamodb')
connections_table = dynamodb.Table(os.environ.get('CONNECTIONS_TABLE', 'WebSocketConnections'))
devices_table = dynamodb.Table(os.environ.get('DEVICES_TABLE', 'Devices'))

# Shadow field mapping: short names (from firmware) -> full names (for compatibility)
SHADOW_FIELD_MAP = {
    'ms': 'motor_speed',
    'o1': 'OUT1',
    'o2': 'OUT2',
    'ps': 'power_saving',
    'i1': 'IN1',
    'i2': 'IN2',
    'ch': 'charging'
}

def normalize_shadow_state(shadow_state):
    """Convert short field names to full names for backward compatibility"""
    if not shadow_state:
        return shadow_state
    
    normalized = {}
    for key, value in shadow_state.items():
        full_name = SHADOW_FIELD_MAP.get(key, key)
        normalized[full_name] = value
    
    return normalized

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
    # Format depends on IoT Rule SQL: SELECT * FROM '$aws/things/+/shadow/update/documents'
    try:
        # Extract client_id from various possible locations in the event
        # thingName is the primary source (from IoT Rule SQL: topic(3) as thingName)
        client_id = None
        
        # Try thingName first (most common)
        thing_name = event.get('thingName')
        if thing_name and str(thing_name).strip():
            client_id = str(thing_name).strip()
            print(f"✅ Found thingName: {client_id}")
        
        # Fallback to client_id
        if not client_id:
            client_id_val = event.get('client_id')
            if client_id_val and str(client_id_val).strip():
                client_id = str(client_id_val).strip()
                print(f"✅ Found client_id: {client_id}")
        
        # Fallback to extracting from topic
        if not client_id and 'topic' in event:
            topic = event.get('topic', '')
            if topic:
                parts = str(topic).split('/')
                if len(parts) >= 3:
                    client_id = str(parts[2]).strip()
                    print(f"✅ Extracted from topic: {client_id}")
        
        # Get state from shadow document - handle different event structures
        # Structure 1: event.current.state (from shadow/documents topic)
        # Structure 2: event.state (direct shadow update)
        current = event.get('current', {})
        if not current and 'previous' in event:
            current = event.get('previous', {})
        
        state = {}
        if isinstance(current, dict):
            state = current.get('state', {})
        if not state and 'state' in event:
            state = event.get('state', {})
        
        reported = state.get('reported', {}) if isinstance(state, dict) else {}
        desired = state.get('desired', {}) if isinstance(state, dict) else {}
        
        if not client_id:
            print(f"⚠️ No client_id in event. Event keys: {list(event.keys())}")
            print(f"   thingName value: {repr(event.get('thingName'))}")
            print(f"   thingName type: {type(event.get('thingName'))}")
            print(f"   client_id value: {repr(event.get('client_id'))}")
            print(f"   Event sample: {json.dumps({k: str(v)[:100] if not isinstance(v, dict) else 'dict' for k, v in list(event.items())[:6]}, indent=2)}")
            return {'statusCode': 400, 'body': 'Missing client_id'}
        
        # Shadow update/documents events include a monotonically increasing version.
        # Include it so the frontend can ignore out-of-order deliveries (which happen in practice).
        shadow_version = event.get('version') or current.get('version') or event.get('previous', {}).get('version', 0)
        shadow_ts = event.get('timestamp') or current.get('timestamp') or event.get('previous', {}).get('timestamp', 0)
        
        # Normalize shadow state (convert short names to full names)
        normalized_reported = normalize_shadow_state(reported)
        normalized_desired = normalize_shadow_state(desired)
        
        print(f"📦 Parsed event - client_id: {client_id}, version: {shadow_version}, timestamp: {shadow_ts}")
        print(f"   Reported keys (raw): {list(reported.keys())}, (normalized): {list(normalized_reported.keys())}")
        print(f"   Desired keys (raw): {list(desired.keys())}, (normalized): {list(normalized_desired.keys())}")

        # Build the message to send to frontend (using normalized names)
        message = {
            'type': 'SHADOW_UPDATE',
            'client_id': client_id,
            'timestamp': shadow_ts,
            'version': shadow_version,
            'reported': {
                'out1_state': normalized_reported.get('OUT1', 0),
                'out2_state': normalized_reported.get('OUT2', 0),
                'motor_speed': normalized_reported.get('motor_speed', 0),
                'power_saving': normalized_reported.get('power_saving', 0),
                'in1_state': normalized_reported.get('IN1', 0),
                'in2_state': normalized_reported.get('IN2', 0),
                'charging': normalized_reported.get('charging', 0),
                'connection_status': normalized_reported.get('connection_status', 'unknown')
            },
            'desired': {
                'out1_state': normalized_desired.get('OUT1'),
                'out2_state': normalized_desired.get('OUT2'),
                'motor_speed': normalized_desired.get('motor_speed'),
                'power_saving': normalized_desired.get('power_saving')
            }
        }
        
    except Exception as e:
        print(f"❌ Error parsing event: {str(e)}")
        return {'statusCode': 400, 'body': f'Invalid event format: {str(e)}'}
    
    # Get device owner (user_email) from Devices table
    device_owner = None
    try:
        response = devices_table.get_item(Key={'client_id': client_id})
        if 'Item' in response:
            device_owner = response['Item'].get('user_email')
            print(f"📧 Device {client_id} belongs to user: {device_owner}")
        else:
            print(f"⚠️ Device {client_id} not found in Devices table")
    except Exception as e:
        print(f"⚠️ Error fetching device owner: {str(e)}")
    
    # Get all connected clients and filter by ownership
    try:
        # Scan for all connections
        response = connections_table.scan()
        connections = response.get('Items', [])
        
        # Filter connections based on user ownership
        # Only send to connections where:
        # 1. user_email matches device owner (multi-device view)
        # 2. OR client_id matches (single-device view)
        relevant_connections = []
        for conn in connections:
            # Check if connection belongs to device owner
            if device_owner and conn.get('user_email') == device_owner:
                relevant_connections.append(conn)
            # OR check if connection explicitly subscribed to this device
            elif conn.get('client_id') == client_id:
                relevant_connections.append(conn)
        
        print(f"📡 Found {len(connections)} total connections, {len(relevant_connections)} relevant for client_id={client_id} (owner: {device_owner})")
        if len(relevant_connections) == 0:
            print(f"⚠️ No connections found for client_id={client_id}. Available connections:")
            for c in connections[:5]:  # Show first 5 for debugging
                print(f"   - connectionId: {c.get('connectionId', 'N/A')}, user_email: {c.get('user_email', 'N/A')}, client_id: {c.get('client_id', 'N/A')}")
        
    except Exception as e:
        print(f"❌ Error scanning connections: {str(e)}")
        return {'statusCode': 500, 'body': f'Failed to get connections: {str(e)}'}
    
    # Create API Gateway Management API client
    apigw_management = boto3.client(
        'apigatewaymanagementapi',
        endpoint_url=websocket_endpoint
    )
    
    # Send message to each connected client in parallel (to avoid timeout)
    message_json = json.dumps(message).encode('utf-8')
    stale_connections = []
    successful_sends = 0
    
    def send_to_connection(connection):
        connection_id = connection['connectionId']
        try:
            apigw_management.post_to_connection(
                ConnectionId=connection_id,
                Data=message_json
            )
            return ('success', connection_id)
        except apigw_management.exceptions.GoneException:
            return ('stale', connection_id)
        except Exception as e:
            print(f"❌ Error sending to {connection_id[:8]}...: {str(e)}")
            return ('error', connection_id)
    
    # Use ThreadPoolExecutor to send messages in parallel (max 50 concurrent)
    with ThreadPoolExecutor(max_workers=50) as executor:
        futures = {executor.submit(send_to_connection, conn): conn for conn in relevant_connections}
        
        for future in as_completed(futures):
            try:
                result_type, connection_id = future.result()
                if result_type == 'success':
                    successful_sends += 1
                    if successful_sends <= 5:  # Only log first 5 to avoid log spam
                        print(f"✅ Sent SHADOW_UPDATE to {connection_id[:8]}...")
                elif result_type == 'stale':
                    stale_connections.append(connection_id)
            except Exception as e:
                print(f"❌ Error processing connection: {str(e)}")
    
    print(f"📊 Sent to {successful_sends}/{len(relevant_connections)} connections, {len(stale_connections)} stale")
    
    # Batch delete stale connections (DynamoDB batch_write_item can handle up to 25 items)
    if stale_connections:
        print(f"🧹 Cleaning up {len(stale_connections)} stale connections...")
        # Delete in batches of 25 (DynamoDB limit)
        batch_size = 25
        for i in range(0, len(stale_connections), batch_size):
            batch = stale_connections[i:i + batch_size]
            try:
                with connections_table.batch_writer() as batch_writer:
                    for connection_id in batch:
                        batch_writer.delete_item(Key={'connectionId': connection_id})
                print(f"   ✅ Deleted batch of {len(batch)} stale connections")
            except Exception as e:
                print(f"   ❌ Error deleting batch: {str(e)}")
    
    return {
        'statusCode': 200,
        'body': f'Broadcast to {successful_sends} active clients, cleaned {len(stale_connections)} stale'
    }

