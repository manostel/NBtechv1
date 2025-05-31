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
        'Access-Control-Allow-Origin': '*' ,
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
        
        # We only need the timestamp for the frontend to calculate uptime live
        return {
            'client_id': latest_start['client_id'],
            'device': latest_start['device'],
            'timestamp': latest_start['timestamp'],
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
        start_time_info = get_latest_start_time(client_id)
        
        if not start_time_info:
            return {
                'statusCode': 404,
                'headers': get_cors_headers(),
                'body': json.dumps({"error": f"No start time found for device {client_id}"})
            }

        # Return the start time data
        # Use the decimal_default function for serialization
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps(start_time_info)
        }

    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({"error": f"Internal server error: {str(e)}"})
        } 