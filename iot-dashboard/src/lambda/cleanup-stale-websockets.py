#!/usr/bin/env python3
"""
Manual cleanup script for stale WebSocket connections.
Run this periodically or when you notice too many connections.

Usage:
  python cleanup-stale-websockets.py [--dry-run]
"""

import boto3
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configuration
WEBSOCKET_ENDPOINT = "https://2e3uhs3ur2.execute-api.eu-central-1.amazonaws.com/production"
CONNECTIONS_TABLE = "WebSocketConnections"
MAX_WORKERS = 50

def main():
    dry_run = '--dry-run' in sys.argv
    
    dynamodb = boto3.resource('dynamodb')
    connections_table = dynamodb.Table(CONNECTIONS_TABLE)
    
    # Get all connections
    print(f"📡 Scanning WebSocketConnections table...")
    response = connections_table.scan()
    connections = response.get('Items', [])
    print(f"   Found {len(connections)} total connections")
    
    if len(connections) == 0:
        print("✅ No connections to clean up")
        return
    
    # Test each connection
    apigw_management = boto3.client(
        'apigatewaymanagementapi',
        endpoint_url=WEBSOCKET_ENDPOINT
    )
    
    def check_connection(connection):
        connection_id = connection['connectionId']
        try:
            apigw_management.get_connection(ConnectionId=connection_id)
            return ('active', connection_id)
        except apigw_management.exceptions.GoneException:
            return ('stale', connection_id)
        except Exception as e:
            print(f"⚠️ Error checking {connection_id[:8]}...: {str(e)}")
            return ('error', connection_id)
    
    print(f"🔍 Checking connection status (parallel, {MAX_WORKERS} workers)...")
    stale_connections = []
    active_connections = []
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(check_connection, conn): conn for conn in connections}
        
        for future in as_completed(futures):
            try:
                result_type, connection_id = future.result()
                if result_type == 'active':
                    active_connections.append(connection_id)
                elif result_type == 'stale':
                    stale_connections.append(connection_id)
            except Exception as e:
                print(f"❌ Error processing connection: {str(e)}")
    
    print(f"\n📊 Results:")
    print(f"   ✅ Active: {len(active_connections)}")
    print(f"   ❌ Stale:  {len(stale_connections)}")
    
    # Show active connections
    if active_connections:
        print(f"\n🟢 Active connections:")
        for conn_id in active_connections[:10]:  # Show first 10
            conn = next(c for c in connections if c['connectionId'] == conn_id)
            client_id = conn.get('client_id', 'N/A')
            print(f"   - {conn_id[:16]}... (client_id: {client_id})")
        if len(active_connections) > 10:
            print(f"   ... and {len(active_connections) - 10} more")
    
    # Clean up stale connections
    if stale_connections:
        if dry_run:
            print(f"\n🔍 DRY RUN: Would delete {len(stale_connections)} stale connections")
            for conn_id in stale_connections[:10]:
                conn = next(c for c in connections if c['connectionId'] == conn_id)
                client_id = conn.get('client_id', 'N/A')
                print(f"   - {conn_id[:16]}... (client_id: {client_id})")
            if len(stale_connections) > 10:
                print(f"   ... and {len(stale_connections) - 10} more")
        else:
            print(f"\n🧹 Deleting {len(stale_connections)} stale connections...")
            batch_size = 25
            deleted_count = 0
            
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
            
            print(f"\n✅ Cleanup complete! Deleted {deleted_count} stale connections")
    else:
        print(f"\n✅ No stale connections to clean up!")

if __name__ == '__main__':
    main()

