import json
import boto3
import os
from botocore.exceptions import ClientError

# Initialize SNS client
sns = boto3.client('sns')

def lambda_handler(event, context):
    """
    Lambda function to publish notifications to AWS SNS
    """
    try:
        # Parse request body
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})
            
        action = body.get('action')
        
        if action == 'send_notification':
            return send_notification(body)
        elif action == 'register_device':
            return register_device(body)
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid action'})
            }
            
    except Exception as e:
        print(f"Error: {str(e)}")
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
        response = sns.publish(
            TargetArn=target_arn,
            Message=message,
            Subject=subject,
            MessageStructure='json' if data.get('json_structure') else None,
            MessageAttributes=message_attributes
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'message_id': response['MessageId']
            })
        }
        
    except ClientError as e:
        print(f"SNS Error: {e}")
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
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'endpoint_arn': response['EndpointArn']
            })
        }
        
    except ClientError as e:
        print(f"SNS Error: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

