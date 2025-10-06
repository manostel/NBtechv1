import json
import boto3
from boto3.dynamodb.conditions import Key
from decimal import Decimal
from datetime import datetime

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
device_states_table = dynamodb.Table('IoT_DeviceStatus')

# Add this helper function to handle Decimal serialization
def decimal_default(obj):
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError

def create_cors_response(status_code, body):
    """Create a response with CORS headers"""
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'OPTIONS,POST',
            'Content-Type': 'application/json'
        },
        'body': json.dumps(body, default=decimal_default)
    }

def get_latest_state(client_id):
    """Get the latest state for a specific device"""
    try:
        # Query the table for the latest record for this client_id
        response = device_states_table.query(
            KeyConditionExpression=Key('client_id').eq(client_id),
            ScanIndexForward=False,  # Sort in descending order (newest first)
            Limit=1  # We only need the latest record
        )

        if not response['Items']:
            return None

        latest_state = response['Items'][0]
        return {
            'client_id': latest_state['client_id'],
            'timestamp': latest_state['timestamp'],
            'charging': int(latest_state.get('charging', 0)),
            'in1_state': int(latest_state.get('in1_state', 0)),
            'in2_state': int(latest_state.get('in2_state', 0)),
            'motor_speed': int(latest_state.get('motor_speed', 0)),
            'out1_state': int(latest_state.get('out1_state', 0)),
            'out2_state': int(latest_state.get('out2_state', 0)),
            'power_saving': int(latest_state.get('power_saving', 0))
        }

    except Exception as e:
        print(f"Error getting latest state for {client_id}: {str(e)}")
        return None

def lambda_handler(event, context):
    """Main Lambda handler function"""
    print(f"Received event: {json.dumps(event)}")

    # Handle CORS preflight request
    if event.get("httpMethod") == "OPTIONS":
        return create_cors_response(200, {"message": "CORS preflight successful"})

    try:
        # Parse request body
        if isinstance(event.get('body'), str):
            body = json.loads(event.get('body', '{}'))
        else:
            body = event.get('body', {})
        
        # Handle both single device and bulk requests
        client_ids = []
        
        # Check for single device request (old format)
        if 'client_id' in body:
            client_ids = [body['client_id']]
        # Check for bulk request (new format)
        elif 'client_ids' in body:
            client_ids = body['client_ids']
        # Check if client_ids is directly in the event
        elif 'client_ids' in event:
            client_ids = event['client_ids']
        else:
            return create_cors_response(400, {
                "error": "Missing client_id or client_ids parameter"
            })
        
        if not client_ids or not isinstance(client_ids, list):
            return create_cors_response(400, {
                "error": "Invalid client_ids parameter. Expected array of client IDs."
            })

        # Get states for all devices
        device_states = []
        for client_id in client_ids:
            state = get_latest_state(client_id)
            if state:
                device_states.append(state)

        # Return format based on request type
        if len(client_ids) == 1:
            # Single device request - return the device state directly (old format compatibility)
            if device_states:
                return create_cors_response(200, device_states[0])
            else:
                return create_cors_response(404, {
                    "error": f"No state found for device {client_ids[0]}"
                })
        else:
            # Bulk request - return device_states array (new format)
            return create_cors_response(200, {
                "device_states": device_states
            })

    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return create_cors_response(500, {
            "error": f"Internal server error: {str(e)}"
        })
