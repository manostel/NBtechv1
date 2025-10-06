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
        'body': json.dumps(body, default=decimal_default)  # Add the default serializer
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
        print(f"Error getting latest state: {str(e)}")
        return None

def lambda_handler(event, context):
    """Main Lambda handler function"""
    print(f"Received event: {json.dumps(event)}")

    # Handle CORS preflight request
    if event.get("httpMethod") == "OPTIONS":
        return create_cors_response(200, {"message": "CORS preflight successful"})

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
            return create_cors_response(400, {
                "error": "Missing client_id parameter"
            })

        # Get the latest state
        latest_state = get_latest_state(client_id)
        
        if not latest_state:
            return create_cors_response(404, {
                "error": f"No state found for device {client_id}"
            })

        # Return the state data with CORS headers
        return create_cors_response(200, latest_state)

    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return create_cors_response(500, {
            "error": f"Internal server error: {str(e)}"
        }) 