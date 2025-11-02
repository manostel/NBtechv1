import json
import boto3
import logging
from datetime import datetime, timezone
from boto3.dynamodb.conditions import Key
from decimal import Decimal
from typing import Dict, List, Optional

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
subscriptions_table = dynamodb.Table('IoT_DeviceSubscriptions')
device_data_table = dynamodb.Table('IoT_DeviceData')

def decimal_default(obj):
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError

def get_cors_headers():
    """Return CORS headers for the response"""
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Origin,X-Requested-With',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,DELETE',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json'
    }

def cors_response(status_code, body):
    """Create a response with CORS headers"""
    return {
        'statusCode': status_code,
        'headers': get_cors_headers(),
        'body': json.dumps(body, default=decimal_default)
    }

def validate_subscription_data(subscription_data):
    """Validate subscription data"""
    required_fields = ['device_id', 'parameter_type', 'parameter_name', 'condition_type', 'notification_method']
    
    for field in required_fields:
        if field not in subscription_data or not subscription_data[field]:
            return False, f"Missing required field: {field}"
    
    # Validate parameter types
    valid_parameter_types = ['inputs', 'outputs', 'metrics', 'variables']
    if subscription_data['parameter_type'] not in valid_parameter_types:
        return False, f"Invalid parameter_type. Must be one of: {', '.join(valid_parameter_types)}"
    
    # Validate condition types
    valid_conditions = ['change', 'above', 'below', 'equals', 'not_equals']
    if subscription_data['condition_type'] not in valid_conditions:
        return False, f"Invalid condition_type. Must be one of: {', '.join(valid_conditions)}"
    
    # Validate notification methods
    valid_notifications = ['in_app', 'email', 'both']
    if subscription_data['notification_method'] not in valid_notifications:
        return False, f"Invalid notification_method. Must be one of: {', '.join(valid_notifications)}"
    
    # Validate threshold value for conditions that require it
    threshold_conditions = ['above', 'below', 'equals', 'not_equals']
    if subscription_data['condition_type'] in threshold_conditions:
        if 'threshold_value' not in subscription_data or not subscription_data['threshold_value']:
            return False, f"threshold_value is required for condition_type: {subscription_data['condition_type']}"
    
    # Optional: cooldown_ms must be integer >= 0 if provided
    if 'cooldown_ms' in subscription_data:
        try:
            cooldown_ms = int(subscription_data.get('cooldown_ms'))
            if cooldown_ms < 0:
                return False, "cooldown_ms must be >= 0"
        except Exception:
            return False, "cooldown_ms must be an integer"
    
    return True, "Valid"

def check_conflicting_subscriptions(user_email, device_id, parameter_name, condition_type, subscription_id=None):
    """Check for conflicting active subscriptions"""
    try:
        # Get all user subscriptions
        user_subscriptions = get_user_subscriptions(user_email)
        
        # Find active subscriptions monitoring the same parameter
        conflicting = []
        for sub in user_subscriptions:
            # Skip the subscription being updated
            if subscription_id and sub.get('subscription_id') == subscription_id:
                continue
            
            # Check if it's monitoring the same parameter
            if (sub.get('device_id') == device_id and 
                sub.get('parameter_name') == parameter_name and 
                sub.get('enabled') == True):
                
                # Always add to conflicting list (even without commands, for condition checks)
                sub_commands = sub.get('commands', [])
                if sub_commands:
                    # Check for conflicting commands
                    for cmd in sub_commands:
                        if cmd.get('action') != 'none':
                            conflicting.append({
                                'subscription_id': sub.get('subscription_id'),
                                'description': sub.get('description', ''),
                                'condition_type': sub.get('condition_type'),
                                'command': cmd
                            })
                else:
                    # No commands, but still conflicting if same condition (especially "change")
                    conflicting.append({
                        'subscription_id': sub.get('subscription_id'),
                        'description': sub.get('description', ''),
                        'condition_type': sub.get('condition_type'),
                        'command': None  # No command conflicts, but condition might conflict
                    })
        
        return conflicting
    except Exception as e:
        logger.error(f"Error checking conflicting subscriptions: {e}")
        return []

def get_available_parameters(device_id, parameter_type):
    """Get available parameters for a device based on parameter type"""
    try:
        logger.info(f"Getting parameters for device {device_id}, type {parameter_type}")
        
        # Try to get actual device data first
        try:
            response = device_data_table.query(
                KeyConditionExpression=Key('client_id').eq(device_id),
                Limit=1,
                ScanIndexForward=False
            )
            
            if response['Items']:
                latest_item = response['Items'][0]
                logger.info(f"Found device data: {json.dumps(latest_item, default=decimal_default)}")
                
                # Extract parameters from the actual data structure
                available_params = []
                
                # Check for parameters in latest_data or direct fields
                data_source = latest_item.get('latest_data', latest_item)
                
                # Define parameter categories
                if parameter_type == 'metrics':
                    metric_fields = ['temperature', 'humidity', 'battery', 'signal_quality', 'pressure']
                    available_params = [field for field in metric_fields if field in data_source]
                elif parameter_type == 'variables':
                    variable_fields = ['motor_speed', 'power_saving', 'status']
                    available_params = [field for field in variable_fields if field in data_source]
                elif parameter_type == 'inputs':
                    # Look for input fields (IN1, IN2, etc.)
                    available_params = [field for field in data_source.keys() if field.startswith('IN')]
                elif parameter_type == 'outputs':
                    # Look for output fields (OUT1, OUT2, etc.)
                    available_params = [field for field in data_source.keys() if field.startswith('OUT')]
                elif parameter_type == 'status':
                    available_params = ['status'] if 'status' in data_source else []
                
                logger.info(f"Dynamic parameters found for {parameter_type}: {available_params}")
                
                # If we found parameters dynamically, return them
                if available_params:
                    return available_params
                    
        except Exception as e:
            logger.warning(f"Error querying device data: {e}")
        
        # Fallback to known parameters if dynamic discovery fails
        logger.info(f"Using fallback parameters for {parameter_type}")
        known_parameters = {
            'inputs': ['inputs.IN1', 'inputs.IN2'],
            'outputs': ['outputs.OUT1', 'outputs.OUT2', 'outputs.speed', 'outputs.charging', 'outputs.power_saving'],
            'metrics': ['temperature', 'humidity', 'battery', 'signal_quality', 'pressure'],
            'variables': ['motor_speed', 'power_saving'],
            'status': ['status']
        }
        
        return known_parameters.get(parameter_type, [])
    except Exception as e:
        logger.error(f"Error getting available parameters: {str(e)}")
        return []

def create_subscription(user_email, subscription_data):
    """Create a new subscription"""
    try:
        # Validate subscription data
        is_valid, error_message = validate_subscription_data(subscription_data)
        if not is_valid:
            return False, error_message
        
        # Check if parameter is available for the device
        available_params = get_available_parameters(subscription_data['device_id'], subscription_data['parameter_type'])
        if subscription_data['parameter_name'] not in available_params:
            return False, f"Parameter {subscription_data['parameter_name']} is not available for this device"
        
        # Check for conflicting active subscriptions
        conflicting = check_conflicting_subscriptions(
            user_email, 
            subscription_data['device_id'], 
            subscription_data['parameter_name'],
            subscription_data['condition_type']
        )
        
        if conflicting:
            # Special case: Multiple "change" condition subscriptions will always conflict
            if subscription_data['condition_type'] == 'change':
                for conflict in conflicting:
                    if conflict.get('condition_type') == 'change':
                        return False, f"Another subscription is already monitoring '{subscription_data['parameter_name']}' with a 'change' condition. Only one 'change' subscription is allowed per parameter. Please disable the existing subscription or use a different condition type like 'above' or 'below'."
            
            # Check if new subscription has commands that conflict
            new_commands = subscription_data.get('commands', [])
            for new_cmd in new_commands:
                if new_cmd.get('action') == 'none':
                    continue
                
                new_action = new_cmd.get('action')
                new_value = new_cmd.get('value', '')
                new_target = new_cmd.get('target_device', subscription_data['device_id'])
                
                # Check against existing conflicting subscriptions
                for conflict in conflicting:
                    conflict_cmd = conflict.get('command')
                    
                    # Skip if no command in conflict (handled by condition check above)
                    if conflict_cmd is None:
                        continue
                    
                    conflict_action = conflict_cmd.get('action')
                    conflict_value = conflict_cmd.get('value', '')
                    conflict_target = conflict_cmd.get('target_device', subscription_data['device_id'])
                    
                    # If same action and target device, but different value, it's a conflict
                    if (new_action == conflict_action and 
                        new_target == conflict_target and 
                        new_value != conflict_value):
                        return False, f"Another active subscription monitoring '{subscription_data['parameter_name']}' would trigger a different command for {conflict_action} ({conflict_value} vs {new_value}). This would cause conflicting actions. Please disable the existing subscription or adjust your command settings."
        
        # Generate unique subscription ID
        timestamp = datetime.now(timezone.utc).timestamp()
        subscription_id = f"{user_email}_{subscription_data['device_id']}_{subscription_data['parameter_name']}_{timestamp}"
        
        # Convert tolerance_percent from float to Decimal for DynamoDB compatibility
        tolerance_percent_value = subscription_data.get('tolerance_percent')
        if tolerance_percent_value is not None:
            if isinstance(tolerance_percent_value, float):
                tolerance_percent_value = Decimal(str(tolerance_percent_value))
            elif isinstance(tolerance_percent_value, (int, str)):
                tolerance_percent_value = Decimal(str(tolerance_percent_value))
        
        # Create subscription object
        subscription = {
            'user_email': user_email,
            'subscription_id': subscription_id,
            'device_id': subscription_data['device_id'],
            'parameter_type': subscription_data['parameter_type'],
            'parameter_name': subscription_data['parameter_name'],
            'condition_type': subscription_data['condition_type'],
            'threshold_value': subscription_data.get('threshold_value', None),
            'cooldown_ms': int(subscription_data.get('cooldown_ms', 30000)) if str(subscription_data.get('cooldown_ms', '')).strip() != '' else 30000,
            'tolerance_percent': tolerance_percent_value,  # Decimal type for DynamoDB (0.01 = 1%, 0.02 = 2%, etc.)
            'notification_method': subscription_data['notification_method'],
            'enabled': subscription_data.get('enabled', True),
            'description': subscription_data.get('description', ''),
            'commands': subscription_data.get('commands', []),
            'created_at': datetime.now(timezone.utc).isoformat(),
            'last_triggered': None,
            'trigger_count': 0
        }
        
        # Store in DynamoDB
        subscriptions_table.put_item(Item=subscription)
        
        return True, subscription
    except Exception as e:
        logger.error(f"Error creating subscription: {str(e)}")
        return False, str(e)

def get_user_subscriptions(user_email):
    """Get all subscriptions for a user"""
    try:
        response = subscriptions_table.query(
            KeyConditionExpression=Key('user_email').eq(user_email)
        )
        return response['Items']
    except Exception as e:
        logger.error(f"Error getting subscriptions: {str(e)}")
        return []

def update_subscription(user_email, subscription_id, subscription_data):
    """Update an existing subscription"""
    try:
        # Validate subscription data
        is_valid, error_message = validate_subscription_data(subscription_data)
        if not is_valid:
            return False, error_message
        
        # Check if parameter is available for the device
        available_params = get_available_parameters(subscription_data['device_id'], subscription_data['parameter_type'])
        if subscription_data['parameter_name'] not in available_params:
            return False, f"Parameter {subscription_data['parameter_name']} is not available for this device"
        
        # Check for conflicting active subscriptions (excluding the one being updated)
        conflicting = check_conflicting_subscriptions(
            user_email, 
            subscription_data['device_id'], 
            subscription_data['parameter_name'],
            subscription_data['condition_type'],
            subscription_id=subscription_id
        )
        
        if conflicting:
            # Special case: Multiple "change" condition subscriptions will always conflict
            if subscription_data['condition_type'] == 'change':
                for conflict in conflicting:
                    if conflict.get('condition_type') == 'change':
                        return False, f"Another subscription is already monitoring '{subscription_data['parameter_name']}' with a 'change' condition. Only one 'change' subscription is allowed per parameter. Please disable the existing subscription or use a different condition type like 'above' or 'below'."
            
            # Check if updated subscription has commands that conflict
            new_commands = subscription_data.get('commands', [])
            for new_cmd in new_commands:
                if new_cmd.get('action') == 'none':
                    continue
                
                new_action = new_cmd.get('action')
                new_value = new_cmd.get('value', '')
                new_target = new_cmd.get('target_device', subscription_data['device_id'])
                
                # Check against existing conflicting subscriptions
                for conflict in conflicting:
                    conflict_cmd = conflict.get('command')
                    
                    # Skip if no command in conflict (handled by condition check above)
                    if conflict_cmd is None:
                        continue
                    
                    conflict_action = conflict_cmd.get('action')
                    conflict_value = conflict_cmd.get('value', '')
                    conflict_target = conflict_cmd.get('target_device', subscription_data['device_id'])
                    
                    # If same action and target device, but different value, it's a conflict
                    if (new_action == conflict_action and 
                        new_target == conflict_target and 
                        new_value != conflict_value):
                        return False, f"Another active subscription monitoring '{subscription_data['parameter_name']}' would trigger a different command for {conflict_action} ({conflict_value} vs {new_value}). This would cause conflicting actions. Please disable the existing subscription or adjust your command settings."
        
        # Update subscription - include commands, cooldown, and tolerance in the update
        update_expression = "SET device_id = :device_id, parameter_type = :parameter_type, parameter_name = :parameter_name, condition_type = :condition_type, threshold_value = :threshold_value, cooldown_ms = :cooldown_ms, tolerance_percent = :tolerance_percent, notification_method = :notification_method, enabled = :enabled, description = :description, commands = :commands, updated_at = :updated_at"
        
        # Convert tolerance_percent from float to Decimal for DynamoDB compatibility
        tolerance_percent_value = subscription_data.get('tolerance_percent')
        if tolerance_percent_value is not None:
            if isinstance(tolerance_percent_value, float):
                tolerance_percent_value = Decimal(str(tolerance_percent_value))
            elif isinstance(tolerance_percent_value, (int, str)):
                tolerance_percent_value = Decimal(str(tolerance_percent_value))
        
        expression_values = {
            ':device_id': subscription_data['device_id'],
            ':parameter_type': subscription_data['parameter_type'],
            ':parameter_name': subscription_data['parameter_name'],
            ':condition_type': subscription_data['condition_type'],
            ':threshold_value': subscription_data.get('threshold_value', None),
            ':tolerance_percent': tolerance_percent_value,  # Decimal type for DynamoDB
            ':notification_method': subscription_data['notification_method'],
            ':cooldown_ms': int(subscription_data.get('cooldown_ms', 30000)) if str(subscription_data.get('cooldown_ms', '')).strip() != '' else 30000,
            ':enabled': subscription_data.get('enabled', True),
            ':description': subscription_data.get('description', ''),
            ':commands': subscription_data.get('commands', []),
            ':updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        subscriptions_table.update_item(
            Key={
                'user_email': user_email,
                'subscription_id': subscription_id
            },
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values
        )
        
        return True, "Subscription updated successfully"
    except Exception as e:
        logger.error(f"Error updating subscription: {str(e)}")
        return False, str(e)

def delete_subscription(user_email, subscription_id):
    """Delete a subscription"""
    try:
        subscriptions_table.delete_item(
            Key={
                'user_email': user_email,
                'subscription_id': subscription_id
            }
        )
        return True, "Subscription deleted successfully"
    except Exception as e:
        logger.error(f"Error deleting subscription: {str(e)}")
        return False, str(e)

def toggle_subscription(user_email, subscription_id, enabled):
    """Toggle subscription enabled/disabled"""
    try:
        subscriptions_table.update_item(
            Key={
                'user_email': user_email,
                'subscription_id': subscription_id
            },
            UpdateExpression='SET enabled = :enabled, updated_at = :updated_at',
            ExpressionAttributeValues={
                ':enabled': enabled,
                ':updated_at': datetime.now(timezone.utc).isoformat()
            }
        )
        return True, f"Subscription {'enabled' if enabled else 'disabled'} successfully"
    except Exception as e:
        logger.error(f"Error toggling subscription: {str(e)}")
        return False, str(e)

def check_subscription_triggers(device_id, parameter_name, current_value):
    """Check if any subscriptions should be triggered for a parameter change"""
    try:
        # Get all subscriptions for this device and parameter
        response = subscriptions_table.scan(
            FilterExpression='device_id = :device_id AND parameter_name = :parameter_name AND enabled = :enabled',
            ExpressionAttributeValues={
                ':device_id': device_id,
                ':parameter_name': parameter_name,
                ':enabled': True
            }
        )
        
        triggered_subscriptions = []
        
        for subscription in response['Items']:
            should_trigger = False
            
            if subscription['condition_type'] == 'change':
                should_trigger = True
            elif subscription['condition_type'] == 'above' and current_value > subscription.get('threshold_value', 0):
                should_trigger = True
            elif subscription['condition_type'] == 'below' and current_value < subscription.get('threshold_value', 0):
                should_trigger = True
            elif subscription['condition_type'] == 'equals' and current_value == subscription.get('threshold_value', 0):
                should_trigger = True
            elif subscription['condition_type'] == 'not_equals' and current_value != subscription.get('threshold_value', 0):
                should_trigger = True
            
            if should_trigger:
                # Update trigger count and last triggered timestamp
                subscriptions_table.update_item(
                    Key={
                        'user_email': subscription['user_email'],
                        'subscription_id': subscription['subscription_id']
                    },
                    UpdateExpression='SET last_triggered = :last_triggered, trigger_count = trigger_count + :increment',
                    ExpressionAttributeValues={
                        ':last_triggered': datetime.now(timezone.utc).isoformat(),
                        ':increment': 1
                    }
                )
                
                triggered_subscriptions.append(subscription)
        
        return triggered_subscriptions
    except Exception as e:
        logger.error(f"Error checking subscription triggers: {str(e)}")
        return []

def get_user_subscription_limits(user_email):
    """Get user subscription limits"""
    try:
        # Get current subscription count
        subscriptions = get_user_subscriptions(user_email)
        current_count = len(subscriptions)
        
        # Default limits (can be made configurable)
        max_subscriptions = 5
        remaining = max_subscriptions - current_count
        can_create_more = remaining > 0
        
        return {
            'current_subscriptions': current_count,
            'max_subscriptions': max_subscriptions,
            'remaining_subscriptions': remaining,
            'can_create_more': can_create_more
        }
    except Exception as e:
        logger.error(f"Error getting user limits: {str(e)}")
        # Return default limits on error
        return {
            'current_subscriptions': 0,
            'max_subscriptions': 5,
            'remaining_subscriptions': 5,
            'can_create_more': True
        }

def lambda_handler(event, context):
    try:
        logger.info("Received event: %s", json.dumps(event))
        
        # Handle CORS preflight request
        if event.get("httpMethod") == "OPTIONS":
            return {
                'statusCode': 200,
                'headers': get_cors_headers(),
                'body': json.dumps({"message": "CORS preflight successful"})
            }
        
        # Parse request body
        if 'body' in event:
            body = json.loads(event['body'])
        else:
            body = event
        
        action = body.get('action')
        user_email = body.get('user_email')
        
        if not action or not user_email:
            return cors_response(400, {
                'error': 'Missing required parameters: action and user_email',
                'success': False
            })
        
        if action == 'get_subscriptions':
            subscriptions = get_user_subscriptions(user_email)
            return cors_response(200, {
                'subscriptions': subscriptions,
                'success': True
            })
        
        elif action == 'create_subscription':
            subscription_data = body.get('subscription')
            if not subscription_data:
                return cors_response(400, {
                    'error': 'Missing subscription data',
                    'success': False
                })
            
            success, result = create_subscription(user_email, subscription_data)
            if success:
                return cors_response(200, {
                    'message': 'Subscription created successfully',
                    'subscription': result,
                    'success': True
                })
            else:
                # Return 200 with success: false for easier frontend error handling
                return cors_response(200, {
                    'error': result,
                    'success': False
                })
        
        elif action == 'update_subscription':
            subscription_id = body.get('subscription_id')
            subscription_data = body.get('subscription')
            
            if not subscription_id or not subscription_data:
                return cors_response(400, {
                    'error': 'Missing subscription_id or subscription data',
                    'success': False
                })
            
            success, result = update_subscription(user_email, subscription_id, subscription_data)
            if success:
                return cors_response(200, {
                    'message': result,
                    'success': True
                })
            else:
                # Return 200 with success: false for easier frontend error handling
                return cors_response(200, {
                    'error': result,
                    'success': False
                })
        
        elif action == 'delete_subscription':
            subscription_id = body.get('subscription_id')
            if not subscription_id:
                return cors_response(400, {
                    'error': 'Missing subscription_id',
                    'success': False
                })
            
            success, result = delete_subscription(user_email, subscription_id)
            if success:
                return cors_response(200, {
                    'message': result,
                    'success': True
                })
            else:
                return cors_response(400, {
                    'error': result,
                    'success': False
                })
        
        elif action == 'toggle_subscription':
            subscription_id = body.get('subscription_id')
            enabled = body.get('enabled')
            
            if subscription_id is None or enabled is None:
                return cors_response(400, {
                    'error': 'Missing subscription_id or enabled status',
                    'success': False
                })
            
            success, result = toggle_subscription(user_email, subscription_id, enabled)
            if success:
                return cors_response(200, {
                    'message': result,
                    'success': True
                })
            else:
                return cors_response(400, {
                    'error': result,
                    'success': False
                })
        
        elif action == 'check_triggers':
            device_id = body.get('device_id')
            parameter_name = body.get('parameter_name')
            current_value = body.get('current_value')
            
            if not device_id or not parameter_name or current_value is None:
                return cors_response(400, {
                    'error': 'Missing required parameters for trigger check',
                    'success': False
                })
            
            triggered_subscriptions = check_subscription_triggers(device_id, parameter_name, current_value)
            return cors_response(200, {
                'triggered_subscriptions': triggered_subscriptions,
                'success': True
            })
        
        elif action == 'get_user_limits':
            limits = get_user_subscription_limits(user_email)
            return cors_response(200, {
                'current_subscriptions': limits['current_subscriptions'],
                'max_subscriptions': limits['max_subscriptions'],
                'remaining_subscriptions': limits['remaining_subscriptions'],
                'can_create_more': limits['can_create_more'],
                'success': True
            })
        
        elif action == 'test_parameters':
            device_id = body.get('device_id')
            parameter_type = body.get('parameter_type')
            if not device_id or not parameter_type:
                return cors_response(400, {
                    'error': 'Missing device_id or parameter_type',
                    'success': False
                })
            
            params = get_available_parameters(device_id, parameter_type)
            return cors_response(200, {
                'device_id': device_id,
                'parameter_type': parameter_type,
                'available_parameters': params,
                'success': True
            })
        
        else:
            return cors_response(400, {
                'error': f'Invalid action: {action}',
                'success': False
            })
    
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return cors_response(500, {
            'error': str(e),
            'success': False
        })
