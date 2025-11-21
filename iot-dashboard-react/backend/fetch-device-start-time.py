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

def decimal_to_float(obj):
    """Recursively convert Decimal to float"""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: decimal_to_float(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [decimal_to_float(x) for x in obj]
    return obj

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
    """Get the latest start time and all startup data for a specific device"""
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
        
        # Convert all Decimal values to float
        latest_start = decimal_to_float(latest_start)
        
        # Return all fields for backward compatibility and new startup_data
        return {
            'client_id': latest_start.get('client_id'),
            'device': latest_start.get('device'),
            'timestamp': latest_start.get('timestamp'),
            'startup_data': latest_start  # Include all fields as startup_data
        }

    except Exception as e:
        print(f"Error getting latest start time: {str(e)}")
        import traceback
        traceback.print_exc()
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

        # Get the latest start time (which now includes all startup data)
        start_time_info = get_latest_start_time(client_id)
        
        if not start_time_info:
            return {
                'statusCode': 404,
                'headers': get_cors_headers(),
                'body': json.dumps({"error": f"No start time found for device {client_id}"})
            }

        # Return the start time data (startup_data is already included)
        # Use the decimal_default function for serialization
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps(start_time_info, default=decimal_default)
        }

    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({"error": f"Internal server error: {str(e)}"})
        } 