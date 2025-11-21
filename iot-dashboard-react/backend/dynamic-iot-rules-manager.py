import json
import boto3
import logging
from datetime import datetime, timezone
from boto3.dynamodb.conditions import Key
from decimal import Decimal

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS services
dynamodb = boto3.resource('dynamodb')
iot_client = boto3.client('iot')
subscriptions_table = dynamodb.Table('IoT_DeviceSubscriptions')
user_limits_table = dynamodb.Table('IoT_UserLimits')

# Constants
MAX_SUBSCRIPTIONS_PER_USER = 5
LAMBDA_FUNCTION_ARN = "arn:aws:lambda:eu-central-1:YOUR_ACCOUNT_ID:function:iot-subscription-trigger"

def decimal_default(obj):
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError

def cors_response(status_code, body):
    """Create a response with CORS headers"""
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Origin,X-Requested-With',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,DELETE',
            'Access-Control-Allow-Credentials': 'true',
            'Content-Type': 'application/json'
        },
        'body': json.dumps(body, default=decimal_default)
    }

def lambda_handler(event, context):
    """
    Dynamic IoT Rules Manager
    Handles user subscription limits and creates/updates IoT Rules automatically
    """
    try:
        logger.info("Received event: %s", json.dumps(event))
        
        # Handle CORS preflight
        if event.get("httpMethod") == "OPTIONS":
            return cors_response(200, {"message": "CORS preflight successful"})
        
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
        
        if action == 'create_subscription':
            return await handle_create_subscription(body)
        elif action == 'update_subscription':
            return await handle_update_subscription(body)
        elif action == 'delete_subscription':
            return await handle_delete_subscription(body)
        elif action == 'get_user_limits':
            return await handle_get_user_limits(body)
        elif action == 'check_subscription_limits':
            return await handle_check_limits(body)
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

async def handle_create_subscription(body):
    """Handle subscription creation with limits and dynamic rule management"""
    try:
        user_email = body['user_email']
        subscription_data = body['subscription']
        
        # Check user subscription limits
        current_count = await get_user_subscription_count(user_email)
        if current_count >= MAX_SUBSCRIPTIONS_PER_USER:
            return cors_response(400, {
                'error': f'Maximum subscription limit reached ({MAX_SUBSCRIPTIONS_PER_USER})',
                'success': False,
                'current_count': current_count,
                'max_allowed': MAX_SUBSCRIPTIONS_PER_USER
            })
        
        # Validate subscription data
        validation_result = validate_subscription_data(subscription_data)
        if not validation_result['valid']:
            return cors_response(400, {
                'error': validation_result['error'],
                'success': False
            })
        
        # Create subscription
        subscription = await create_subscription_record(user_email, subscription_data)
        
        # Update IoT Rules for this device
        await update_device_iot_rules(subscription['device_id'])
        
        # Update user limits
        await update_user_limits(user_email, current_count + 1)
        
        return cors_response(200, {
            'message': 'Subscription created successfully',
            'subscription': subscription,
            'success': True,
            'subscription_count': current_count + 1,
            'max_allowed': MAX_SUBSCRIPTIONS_PER_USER
        })
        
    except Exception as e:
        logger.error(f"Error creating subscription: {e}")
        return cors_response(500, {
            'error': str(e),
            'success': False
        })

async def handle_update_subscription(body):
    """Handle subscription update"""
    try:
        user_email = body['user_email']
        subscription_id = body['subscription_id']
        subscription_data = body['subscription']
        
        # Validate subscription data
        validation_result = validate_subscription_data(subscription_data)
        if not validation_result['valid']:
            return cors_response(400, {
                'error': validation_result['error'],
                'success': False
            })
        
        # Update subscription
        await update_subscription_record(user_email, subscription_id, subscription_data)
        
        # Update IoT Rules for this device
        await update_device_iot_rules(subscription_data['device_id'])
        
        return cors_response(200, {
            'message': 'Subscription updated successfully',
            'success': True
        })
        
    except Exception as e:
        logger.error(f"Error updating subscription: {e}")
        return cors_response(500, {
            'error': str(e),
            'success': False
        })

async def handle_delete_subscription(body):
    """Handle subscription deletion"""
    try:
        user_email = body['user_email']
        subscription_id = body['subscription_id']
        
        # Get subscription details before deletion
        subscription = await get_subscription_record(user_email, subscription_id)
        if not subscription:
            return cors_response(404, {
                'error': 'Subscription not found',
                'success': False
            })
        
        # Delete subscription
        await delete_subscription_record(user_email, subscription_id)
        
        # Update IoT Rules for this device
        await update_device_iot_rules(subscription['device_id'])
        
        # Update user limits
        current_count = await get_user_subscription_count(user_email)
        await update_user_limits(user_email, current_count - 1)
        
        return cors_response(200, {
            'message': 'Subscription deleted successfully',
            'success': True,
            'subscription_count': current_count - 1,
            'max_allowed': MAX_SUBSCRIPTIONS_PER_USER
        })
        
    except Exception as e:
        logger.error(f"Error deleting subscription: {e}")
        return cors_response(500, {
            'error': str(e),
            'success': False
        })

async def handle_get_user_limits(body):
    """Get user subscription limits and current count"""
    try:
        user_email = body['user_email']
        
        current_count = await get_user_subscription_count(user_email)
        user_limits = await get_user_limits_record(user_email)
        
        return cors_response(200, {
            'user_email': user_email,
            'current_subscriptions': current_count,
            'max_subscriptions': MAX_SUBSCRIPTIONS_PER_USER,
            'remaining_subscriptions': MAX_SUBSCRIPTIONS_PER_USER - current_count,
            'can_create_more': current_count < MAX_SUBSCRIPTIONS_PER_USER,
            'limits': user_limits,
            'success': True
        })
        
    except Exception as e:
        logger.error(f"Error getting user limits: {e}")
        return cors_response(500, {
            'error': str(e),
            'success': False
        })

async def handle_check_limits(body):
    """Check if user can create more subscriptions"""
    try:
        user_email = body['user_email']
        
        current_count = await get_user_subscription_count(user_email)
        can_create = current_count < MAX_SUBSCRIPTIONS_PER_USER
        
        return cors_response(200, {
            'can_create_more': can_create,
            'current_count': current_count,
            'max_allowed': MAX_SUBSCRIPTIONS_PER_USER,
            'remaining': MAX_SUBSCRIPTIONS_PER_USER - current_count,
            'success': True
        })
        
    except Exception as e:
        logger.error(f"Error checking limits: {e}")
        return cors_response(500, {
            'error': str(e),
            'success': False
        })

def validate_subscription_data(subscription_data):
    """Validate subscription data"""
    required_fields = ['device_id', 'parameter_name', 'condition_type', 'notification_method']
    
    for field in required_fields:
        if field not in subscription_data or not subscription_data[field]:
            return {
                'valid': False,
                'error': f'Missing required field: {field}'
            }
    
    # Validate condition types
    valid_conditions = ['change', 'above', 'below', 'equals', 'not_equals']
    if subscription_data['condition_type'] not in valid_conditions:
        return {
            'valid': False,
            'error': f'Invalid condition_type. Must be one of: {", ".join(valid_conditions)}'
        }
    
    # Validate notification methods
    valid_notifications = ['in_app', 'email', 'both']
    if subscription_data['notification_method'] not in valid_notifications:
        return {
            'valid': False,
            'error': f'Invalid notification_method. Must be one of: {", ".join(valid_notifications)}'
        }
    
    return {'valid': True}

async def get_user_subscription_count(user_email):
    """Get current subscription count for user"""
    try:
        response = subscriptions_table.query(
            KeyConditionExpression=Key('user_email').eq(user_email)
        )
        return len(response.get('Items', []))
    except Exception as e:
        logger.error(f"Error getting subscription count: {e}")
        return 0

async def create_subscription_record(user_email, subscription_data):
    """Create subscription record in DynamoDB"""
    try:
        subscription_id = f"{user_email}_{subscription_data['device_id']}_{subscription_data['parameter_name']}_{int(datetime.now().timestamp())}"
        
        subscription = {
            'user_email': user_email,
            'subscription_id': subscription_id,
            'device_id': subscription_data['device_id'],
            'parameter_name': subscription_data['parameter_name'],
            'condition_type': subscription_data['condition_type'],
            'threshold_value': subscription_data.get('threshold_value'),
            'tolerance_percent': subscription_data.get('tolerance_percent'),  # Optional: custom tolerance percentage
            'notification_method': subscription_data['notification_method'],
            'enabled': subscription_data.get('enabled', True),
            'description': subscription_data.get('description', ''),
            'created_at': datetime.now(timezone.utc).isoformat(),
            'last_triggered': None,
            'trigger_count': 0
        }
        
        subscriptions_table.put_item(Item=subscription)
        return subscription
        
    except Exception as e:
        logger.error(f"Error creating subscription record: {e}")
        raise

async def update_subscription_record(user_email, subscription_id, subscription_data):
    """Update subscription record"""
    try:
        subscriptions_table.update_item(
            Key={
                'user_email': user_email,
                'subscription_id': subscription_id
            },
            UpdateExpression='SET device_id = :device_id, parameter_name = :parameter_name, condition_type = :condition_type, threshold_value = :threshold_value, tolerance_percent = :tolerance_percent, notification_method = :notification_method, enabled = :enabled, description = :description, updated_at = :updated_at',
            ExpressionAttributeValues={
                ':device_id': subscription_data['device_id'],
                ':parameter_name': subscription_data['parameter_name'],
                ':condition_type': subscription_data['condition_type'],
                ':threshold_value': subscription_data.get('threshold_value'),
                ':tolerance_percent': subscription_data.get('tolerance_percent'),
                ':notification_method': subscription_data['notification_method'],
                ':enabled': subscription_data.get('enabled', True),
                ':description': subscription_data.get('description', ''),
                ':updated_at': datetime.now(timezone.utc).isoformat()
            }
        )
    except Exception as e:
        logger.error(f"Error updating subscription record: {e}")
        raise

async def delete_subscription_record(user_email, subscription_id):
    """Delete subscription record"""
    try:
        subscriptions_table.delete_item(
            Key={
                'user_email': user_email,
                'subscription_id': subscription_id
            }
        )
    except Exception as e:
        logger.error(f"Error deleting subscription record: {e}")
        raise

async def get_subscription_record(user_email, subscription_id):
    """Get subscription record"""
    try:
        response = subscriptions_table.get_item(
            Key={
                'user_email': user_email,
                'subscription_id': subscription_id
            }
        )
        return response.get('Item')
    except Exception as e:
        logger.error(f"Error getting subscription record: {e}")
        return None

async def update_device_iot_rules(device_id):
    """Update IoT Rules for a specific device"""
    try:
        # Get all subscriptions for this device
        response = subscriptions_table.scan(
            FilterExpression='device_id = :device_id AND enabled = :enabled',
            ExpressionAttributeValues={
                ':device_id': device_id,
                ':enabled': True
            }
        )
        
        subscriptions = response.get('Items', [])
        
        if not subscriptions:
            # No subscriptions for this device, remove rule if exists
            await remove_device_iot_rule(device_id)
            return
        
        # Create or update IoT Rule for this device
        await create_device_iot_rule(device_id, subscriptions)
        
    except Exception as e:
        logger.error(f"Error updating IoT Rules for device {device_id}: {e}")

async def create_device_iot_rule(device_id, subscriptions):
    """Create IoT Rule for a specific device"""
    try:
        rule_name = f"SubscriptionRule_{device_id}"
        
        # Build SQL query for this device
        sql_query = f"SELECT *, topic() as topic FROM 'NBtechv1/{device_id}/data/+'"
        
        rule_payload = {
            'sql': sql_query,
            'description': f'Subscription triggers for device {device_id}',
            'actions': [
                {
                    'lambda': {
                        'functionArn': LAMBDA_FUNCTION_ARN
                    }
                }
            ],
            'ruleDisabled': False,
            'awsIotSqlVersion': '2016-03-23'
        }
        
        # Create or update the rule
        try:
            iot_client.create_topic_rule(
                ruleName=rule_name,
                topicRulePayload=rule_payload
            )
            logger.info(f"Created IoT Rule: {rule_name}")
        except iot_client.exceptions.ResourceAlreadyExistsException:
            # Rule exists, update it
            iot_client.replace_topic_rule(
                ruleName=rule_name,
                topicRulePayload=rule_payload
            )
            logger.info(f"Updated IoT Rule: {rule_name}")
        
    except Exception as e:
        logger.error(f"Error creating IoT Rule for device {device_id}: {e}")

async def remove_device_iot_rule(device_id):
    """Remove IoT Rule for a device with no subscriptions"""
    try:
        rule_name = f"SubscriptionRule_{device_id}"
        
        iot_client.delete_topic_rule(ruleName=rule_name)
        logger.info(f"Removed IoT Rule: {rule_name}")
        
    except iot_client.exceptions.ResourceNotFoundException:
        # Rule doesn't exist, that's fine
        pass
    except Exception as e:
        logger.error(f"Error removing IoT Rule for device {device_id}: {e}")

async def update_user_limits(user_email, current_count):
    """Update user subscription limits"""
    try:
        user_limits_table.put_item(Item={
            'user_email': user_email,
            'current_subscriptions': current_count,
            'max_subscriptions': MAX_SUBSCRIPTIONS_PER_USER,
            'last_updated': datetime.now(timezone.utc).isoformat()
        })
    except Exception as e:
        logger.error(f"Error updating user limits: {e}")

async def get_user_limits_record(user_email):
    """Get user limits record"""
    try:
        response = user_limits_table.get_item(
            Key={'user_email': user_email}
        )
        return response.get('Item', {})
    except Exception as e:
        logger.error(f"Error getting user limits: {e}")
        return {}
