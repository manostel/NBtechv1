import json
import boto3
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configuration from environment variables
WEBSOCKET_ENDPOINT = os.environ.get('WEBSOCKET_ENDPOINT')
CONNECTIONS_TABLE_NAME = os.environ.get('CONNECTIONS_TABLE', 'WebSocketConnections')
MAX_WORKERS = int(os.environ.get('MAX_WORKERS', '50'))

dynamodb = boto3.resource('dynamodb')
connections_table = dynamodb.Table(CONNECTIONS_TABLE_NAME)

def lambda_handler(event, context):
    """
    Scheduled cleanup Lambda for stale WebSocket connections.
    Should be triggered by EventBridge on a schedule (e.g., every hour).
    """
    print(f"🧹 Starting scheduled WebSocket cleanup...")
    
    if not WEBSOCKET_ENDPOINT:
        print("❌ WEBSOCKET_ENDPOINT not configured")
        return {'statusCode': 500, 'body': 'WEBSOCKET_ENDPOINT not configured'}
    
    try:
        # Get all connections
        print(f"📡 Scanning {CONNECTIONS_TABLE_NAME} table...")
        response = connections_table.scan()
        connections = response.get('Items', [])
        print(f"   Found {len(connections)} total connections")
        
        if len(connections) == 0:
            print("✅ No connections to check")
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'No connections found',
                    'active': 0,
                    'stale': 0,
                    'deleted': 0
                })
            }
        
        # Create API Gateway Management API client
        apigw_management = boto3.client(
            'apigatewaymanagementapi',
            endpoint_url=WEBSOCKET_ENDPOINT
        )
        
        def check_connection(connection):
            """Check if a connection is still active"""
            connection_id = connection.get('connectionId')
            if not connection_id:
                return ('invalid', None)
            
            try:
                # Try to get connection status
                apigw_management.get_connection(ConnectionId=connection_id)
                return ('active', connection_id)
            except apigw_management.exceptions.GoneException:
                # Connection is closed/stale
                return ('stale', connection_id)
            except Exception as e:
                print(f"⚠️ Error checking {connection_id[:8]}...: {str(e)}")
                return ('error', connection_id)
        
        # Check all connections in parallel
        print(f"🔍 Checking connection status (parallel, {MAX_WORKERS} workers)...")
        stale_connections = []
        active_connections = []
        invalid_connections = []
        
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {executor.submit(check_connection, conn): conn for conn in connections}
            
            for future in as_completed(futures):
                try:
                    result_type, connection_id = future.result()
                    if result_type == 'active':
                        active_connections.append(connection_id)
                    elif result_type == 'stale':
                        stale_connections.append(connection_id)
                    elif result_type == 'invalid':
                        invalid_connections.append(connection_id)
                except Exception as e:
                    print(f"❌ Error processing connection: {str(e)}")
        
        print(f"\n📊 Results:")
        print(f"   ✅ Active: {len(active_connections)}")
        print(f"   ❌ Stale:  {len(stale_connections)}")
        print(f"   ⚠️ Invalid: {len(invalid_connections)}")
        
        # Delete stale connections in batches
        deleted_count = 0
        if stale_connections:
            print(f"\n🧹 Deleting {len(stale_connections)} stale connections...")
            batch_size = 25  # DynamoDB batch limit
            
            for i in range(0, len(stale_connections), batch_size):
                batch = stale_connections[i:i + batch_size]
                try:
                    with connections_table.batch_writer() as batch_writer:
                        for connection_id in batch:
                            batch_writer.delete_item(Key={'connectionId': connection_id})
                    deleted_count += len(batch)
                    print(f"   ✅ Deleted batch {i//batch_size + 1}: {len(batch)} connections ({deleted_count}/{len(stale_connections)})")
                except Exception as e:
                    print(f"   ❌ Error deleting batch: {str(e)}")
        
        # Delete invalid connections (missing connectionId)
        if invalid_connections:
            print(f"\n🧹 Deleting {len(invalid_connections)} invalid connections...")
            # Note: Invalid connections can't be deleted by connectionId, would need to scan and delete differently
            print(f"   ⚠️ Invalid connections need manual cleanup (missing connectionId)")
        
        result = {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Cleanup completed',
                'total_checked': len(connections),
                'active': len(active_connections),
                'stale': len(stale_connections),
                'deleted': deleted_count,
                'invalid': len(invalid_connections)
            })
        }
        
        print(f"\n✅ Cleanup complete! Deleted {deleted_count} stale connections")
        return result
        
    except Exception as e:
        print(f"❌ Error during cleanup: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

