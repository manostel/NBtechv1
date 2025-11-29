import json
import boto3
import os
import logging
from botocore.exceptions import ClientError

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize SNS client
sns = boto3.client('sns')

def lambda_handler(event, context):
    """
    Lambda function to publish notifications to AWS SNS
    """
    # Log the raw event for debugging
    logger.info(f"Received event: {json.dumps(event, default=str)}")
    
    try:
        # Handle different event sources:
        # 1. API Gateway (has 'body' key)
        # 2. Direct Invocation / IoT Rule (payload IS the event)
        
        body = {}
        if 'body' in event:
            if isinstance(event['body'], str):
                body = json.loads(event['body'])
            else:
                body = event['body']
        else:
            # Direct invocation or IoT Rule
            body = event
            
        action = body.get('action')
        logger.info(f"Processing action: {action}")
        
        if action == 'send_notification':
            result = send_notification(body)
            logger.info(f"Result: {result}")
            return result
        elif action == 'register_device':
            result = register_device(body)
            logger.info(f"Result: {result}")
            return result
        else:
            error_msg = f"Invalid action: {action}"
            logger.warning(error_msg)
            return {
                'statusCode': 400,
                'body': json.dumps({'error': error_msg})
            }
            
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def send_notification(data):
    """
    Send a notification to a specific target ARN or Topic ARN
    """
    message = data.get('message')
    subject = data.get('subject', 'IoT Dashboard Notification')
    # Use provided target_arn or fallback to environment variable
    target_arn = data.get('target_arn') or os.environ.get('SNS_TOPIC_ARN')
    
    if not message or not target_arn:
        logger.warning("Missing message or target_arn")
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing message or target_arn (and SNS_TOPIC_ARN env var not set)'})
        }
        
    try:
        # Prepare message attributes if needed
        message_attributes = {}
        if data.get('type'):
            message_attributes['type'] = {
                'DataType': 'String',
                'StringValue': data['type']
            }
            
        # Publish to SNS
        # We need to format the message specifically for GCM (FCM) to ensure it pops up
        # even if the app is in background/killed.
        
        fcm_payload = {
            "notification": {
                "title": subject,
                "body": message,
                "sound": "default",
                "android_channel_id": "iot_alerts"
            },
            "data": {
                "type": data.get('type', 'info'),
                "message": message,
            }
        }
        
        # SNS requires the payload to be a stringified JSON inside the "GCM" key
        # when MessageStructure is 'json'
        sns_message = {
            "default": message, # Fallback for non-mobile endpoints (email/sms)
            "GCM": json.dumps(fcm_payload)
        }

        response = sns.publish(
            TargetArn=target_arn,
            Message=json.dumps(sns_message),
            Subject=subject,
            MessageStructure='json',
            MessageAttributes=message_attributes
        )
        
        logger.info(f"Notification sent. MessageId: {response['MessageId']}")
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'message_id': response['MessageId']
            })
        }
        
    except ClientError as e:
        logger.error(f"SNS Error: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def register_device(data):
    """
    Register a mobile device/endpoint with SNS platform application
    """
    token = data.get('token')
    platform_application_arn = os.environ.get('PLATFORM_APPLICATION_ARN')
    custom_user_data = data.get('user_data', '')
    
    if not token or not platform_application_arn:
        logger.warning("Missing token or platform configuration")
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing token or platform configuration'})
        }
        
    try:
        response = sns.create_platform_endpoint(
            PlatformApplicationArn=platform_application_arn,
            Token=token,
            CustomUserData=custom_user_data
        )
        
        endpoint_arn = response['EndpointArn']
        logger.info(f"Created/Retrieved EndpointArn: {endpoint_arn}")
        
        # Subscribe the endpoint to the global alerts topic
        topic_arn = os.environ.get('SNS_TOPIC_ARN')
        if topic_arn:
            try:
                sns.subscribe(
                    TopicArn=topic_arn,
                    Protocol='application',
                    Endpoint=endpoint_arn
                )
                logger.info(f"Subscribed {endpoint_arn} to {topic_arn}")
            except Exception as sub_error:
                logger.error(f"Error subscribing to topic: {sub_error}")
                # Don't fail the registration if subscription fails
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'endpoint_arn': endpoint_arn
            })
        }
        
    except ClientError as e:
        logger.error(f"SNS Error: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
