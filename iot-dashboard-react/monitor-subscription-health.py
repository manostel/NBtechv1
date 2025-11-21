#!/usr/bin/env python3
"""
Subscription Health Monitor
Monitors subscription system health and auto-disables problematic subscriptions
"""

import boto3
import json
import time
from datetime import datetime, timezone, timedelta
from collections import defaultdict

def monitor_subscription_health():
    """Monitor subscription system health and auto-disable problematic subscriptions"""
    
    dynamodb = boto3.resource('dynamodb', region_name='eu-central-1')
    subscriptions_table = dynamodb.Table('IoT_DeviceSubscriptions')
    subscription_data_table = dynamodb.Table('IoT_SubscriptionData')
    
    print("🔍 Monitoring subscription system health...")
    
    # Get all active subscriptions
    response = subscriptions_table.scan(
        FilterExpression='enabled = :enabled',
        ExpressionAttributeValues={':enabled': True}
    )
    
    subscriptions = response['Items']
    print(f"📊 Found {len(subscriptions)} active subscriptions")
    
    # Analyze each subscription
    problematic_subscriptions = []
    
    for subscription in subscriptions:
        subscription_id = subscription['subscription_id']
        device_id = subscription['device_id']
        parameter_name = subscription['parameter_name']
        trigger_count = subscription.get('trigger_count', 0)
        last_triggered = subscription.get('last_triggered')
        
        # Check for excessive triggering (more than 10 times in 1 hour)
        if trigger_count > 10:
            if last_triggered:
                last_trigger_time = datetime.fromisoformat(last_triggered.replace('Z', '+00:00'))
                time_diff = (datetime.now(timezone.utc) - last_trigger_time).total_seconds()
                
                if time_diff < 3600:  # 1 hour
                    problematic_subscriptions.append({
                        'subscription_id': subscription_id,
                        'reason': 'excessive_triggering',
                        'trigger_count': trigger_count,
                        'time_period': f"{time_diff/60:.1f} minutes"
                    })
        
        # Check for potential loops
        commands = subscription.get('commands', [])
        for command in commands:
            if command.get('action') != 'none':
                target_device = command.get('target_device', device_id)
                
                # Check for self-triggering
                if target_device == device_id:
                    if would_create_loop(parameter_name, command.get('action')):
                        problematic_subscriptions.append({
                            'subscription_id': subscription_id,
                            'reason': 'potential_loop',
                            'parameter': parameter_name,
                            'command': command.get('action')
                        })
    
    # Report findings
    if problematic_subscriptions:
        print(f"⚠️  Found {len(problematic_subscriptions)} problematic subscriptions:")
        
        for issue in problematic_subscriptions:
            print(f"   • {issue['subscription_id']}: {issue['reason']}")
            if issue['reason'] == 'excessive_triggering':
                print(f"     Triggered {issue['trigger_count']} times in {issue['time_period']}")
            elif issue['reason'] == 'potential_loop':
                print(f"     {issue['parameter']} -> {issue['command']} (same device)")
        
        # Auto-disable problematic subscriptions
        print("\n🛡️  Auto-disabling problematic subscriptions...")
        
        for issue in problematic_subscriptions:
            try:
                subscriptions_table.update_item(
                    Key={'subscription_id': issue['subscription_id']},
                    UpdateExpression='SET enabled = :disabled, auto_disabled_reason = :reason',
                    ExpressionAttributeValues={
                        ':disabled': False,
                        ':reason': issue['reason']
                    }
                )
                print(f"   ✅ Disabled {issue['subscription_id']}")
            except Exception as e:
                print(f"   ❌ Failed to disable {issue['subscription_id']}: {e}")
    else:
        print("✅ All subscriptions appear healthy")
    
    # Clean up old subscription data
    cleanup_old_subscription_data(subscription_data_table)
    
    print(f"\n📈 Health check completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

def would_create_loop(parameter_name, command_action):
    """Check if a parameter-command combination would create a loop"""
    
    # Map command actions to parameters they affect
    command_parameter_map = {
        'out1': ['outputs.OUT1', 'outputs.out1'],
        'out2': ['outputs.OUT2', 'outputs.out2'],
        'in1': ['inputs.IN1', 'inputs.in1'],
        'in2': ['inputs.IN2', 'inputs.in2'],
        'speed': ['outputs.speed', 'motor_speed'],
        'power_saving': ['outputs.power_saving', 'power_saving']
    }
    
    affected_parameters = command_parameter_map.get(command_action.lower(), [])
    return parameter_name.lower() in [p.lower() for p in affected_parameters]

def cleanup_old_subscription_data(subscription_data_table):
    """Clean up old subscription tracking data"""
    try:
        # TTL should handle this automatically, but we can also clean manually
        current_time = datetime.now(timezone.utc)
        cutoff_time = current_time - timedelta(days=7)
        
        # Scan for old items (this is expensive, so we limit it)
        response = subscription_data_table.scan(
            FilterExpression='last_updated < :cutoff',
            ExpressionAttributeValues={':cutoff': cutoff_time.isoformat()},
            Limit=100  # Limit to prevent expensive scans
        )
        
        old_items = response.get('Items', [])
        if old_items:
            print(f"🧹 Cleaning up {len(old_items)} old subscription data items...")
            
            # Delete old items in batches
            with subscription_data_table.batch_writer() as batch:
                for item in old_items:
                    batch.delete_item(
                        Key={
                            'device_id': item['device_id'],
                            'parameter_name': item['parameter_name']
                        }
                    )
            
            print(f"   ✅ Cleaned up {len(old_items)} old items")
        
    except Exception as e:
        print(f"   ⚠️  Cleanup error: {e}")

def get_subscription_statistics():
    """Get subscription system statistics"""
    
    dynamodb = boto3.resource('dynamodb', region_name='eu-central-1')
    subscriptions_table = dynamodb.Table('IoT_DeviceSubscriptions')
    
    # Get all subscriptions
    response = subscriptions_table.scan()
    all_subscriptions = response['Items']
    
    # Calculate statistics
    total_subscriptions = len(all_subscriptions)
    active_subscriptions = len([s for s in all_subscriptions if s.get('enabled', False)])
    disabled_subscriptions = total_subscriptions - active_subscriptions
    
    # Count by parameter type
    parameter_types = defaultdict(int)
    for sub in all_subscriptions:
        parameter_types[sub.get('parameter_type', 'unknown')] += 1
    
    # Count by device
    device_counts = defaultdict(int)
    for sub in all_subscriptions:
        device_counts[sub.get('device_id', 'unknown')] += 1
    
    print("\n📊 SUBSCRIPTION STATISTICS:")
    print(f"   Total Subscriptions: {total_subscriptions}")
    print(f"   Active: {active_subscriptions}")
    print(f"   Disabled: {disabled_subscriptions}")
    print(f"   Parameter Types: {dict(parameter_types)}")
    print(f"   Devices: {dict(device_counts)}")
    
    return {
        'total': total_subscriptions,
        'active': active_subscriptions,
        'disabled': disabled_subscriptions,
        'parameter_types': dict(parameter_types),
        'devices': dict(device_counts)
    }

if __name__ == "__main__":
    print("🛡️  Subscription Health Monitor")
    print("=" * 50)
    
    # Get statistics
    stats = get_subscription_statistics()
    
    # Monitor health
    monitor_subscription_health()
    
    print("\n✅ Health monitoring completed")
