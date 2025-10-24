#!/usr/bin/env python3
"""
Clean up IoT_DeviceData table by removing subscription-related records
that are flooding the table with individual output changes.
"""

import boto3
import json
from datetime import datetime, timezone
from boto3.dynamodb.conditions import Key, Attr

def cleanup_device_data_table():
    """Clean up IoT_DeviceData table from subscription flooding"""
    
    dynamodb = boto3.resource('dynamodb', region_name='eu-central-1')
    table = dynamodb.Table('IoT_DeviceData')
    
    print("Scanning IoT_DeviceData table for subscription-related records...")
    
    # Scan for records that look like subscription data (have outputs.OUT1, outputs.OUT2, etc.)
    response = table.scan(
        FilterExpression=Attr('outputs.OUT1').exists() | Attr('outputs.OUT2').exists()
    )
    
    items_to_delete = []
    
    for item in response['Items']:
        # Check if this looks like a subscription record (has outputs but no other device data)
        has_outputs = 'outputs.OUT1' in item or 'outputs.OUT2' in item
        has_device_data = any(key.startswith('data.') for key in item.keys())
        
        if has_outputs and not has_device_data:
            items_to_delete.append({
                'client_id': item['client_id'],
                'timestamp': item['timestamp']
            })
    
    print(f"Found {len(items_to_delete)} subscription-related records to delete")
    
    if items_to_delete:
        print("Deleting subscription-related records...")
        
        # Delete in batches
        batch_size = 25
        for i in range(0, len(items_to_delete), batch_size):
            batch = items_to_delete[i:i + batch_size]
            
            with table.batch_writer() as batch_writer:
                for item in batch:
                    batch_writer.delete_item(
                        Key={
                            'client_id': item['client_id'],
                            'timestamp': item['timestamp']
                        }
                    )
            
            print(f"Deleted batch {i//batch_size + 1}/{(len(items_to_delete) + batch_size - 1)//batch_size}")
    
    print("Cleanup completed!")
    print(f"Deleted {len(items_to_delete)} subscription-related records")
    print("The IoT_DeviceData table should now only contain actual device data")

if __name__ == "__main__":
    cleanup_device_data_table()
