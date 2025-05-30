import json
import boto3
from boto3.dynamodb.conditions import Key
from decimal import Decimal
from datetime import datetime, timezone

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
device_start_table = dynamodb.Table('IoT_DeviceStart')

# Add this helper function to handle Decimal serialization
def decimal_default(obj):
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError

def get_cors_headers():
    """Return CORS headers for the response"""
    return {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json'
    }

def get_latest_start_time(client_id):
    """Get the latest start time for a specific device"""
    try:
        # Query the table for the latest record for this client_id
        response = device_start_table.query(
            KeyConditionExpression=Key('client_id').eq(client_id),
            ScanIndexForward=False,  # Sort in descending order (newest first)
            Limit=1  # We only need the latest record
        )

        if not response['Items']:
            return None

        latest_start = response['Items'][0]
        
        # Calculate uptime
        start_time = datetime.strptime(latest_start['timestamp'], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        uptime_seconds = int((now - start_time).total_seconds())
        
        # Calculate days, hours, minutes, seconds
        days = uptime_seconds // (24 * 3600)
        hours = (uptime_seconds % (24 * 3600)) // 3600
        minutes = (uptime_seconds % 3600) // 60
        seconds = uptime_seconds % 60

        # Format the response to match what DeviceInfoCard expects
        return {
            'client_id': latest_start['client_id'],
            'device': latest_start['device'],
            'startTime': latest_start['timestamp'],
            'uptime': {
                'days': days,
                'hours': hours,
                'minutes': minutes,
                'seconds': seconds
            },
            'battery': 100,  # Default value, should be updated from actual data
            'signal_quality': 100  # Default value, should be updated from actual data
        }

    except Exception as e:
        print(f"Error getting latest start time: {str(e)}")
        return None

def lambda_handler(event, context):
    """Main Lambda handler function"""
    print(f"Received event: {json.dumps(event)}")

    # Handle CORS preflight request
    if event.get("httpMethod") == "OPTIONS":
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps({"message": "CORS preflight successful"})
        }

    try:
        # Get client_id from either direct event or request body
        client_id = None
        
        # Check if client_id is directly in the event
        if 'client_id' in event:
            client_id = event['client_id']
        else:
            # Try to get it from the request body
            if isinstance(event.get('body'), str):
                body = json.loads(event.get('body', '{}'))
            else:
                body = event.get('body', {})
            client_id = body.get('client_id')
        
        if not client_id:
            return {
                'statusCode': 400,
                'headers': get_cors_headers(),
                'body': json.dumps({"error": "Missing client_id parameter"})
            }

        # Get the latest start time
        latest_start = get_latest_start_time(client_id)
        
        if not latest_start:
            return {
                'statusCode': 404,
                'headers': get_cors_headers(),
                'body': json.dumps({"error": f"No start time found for device {client_id}"})
            }

        # Return the start time data
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps(latest_start)
        }

    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({"error": f"Internal server error: {str(e)}"})
        } 