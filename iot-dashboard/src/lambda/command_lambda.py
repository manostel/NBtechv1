import json
import boto3
from datetime import datetime
import time

# Use the correct IoT Core Data Endpoint
iot_endpoint = "https://al047cml3y4l3-ats.iot.eu-central-1.amazonaws.com"

iot_client = boto3.client("iot-data", endpoint_url=iot_endpoint)
dynamodb = boto3.resource('dynamodb')
command_responses_table = dynamodb.Table('IoT_CommandResponses')
device_states_table = dynamodb.Table('IoT_DeviceStates')

def create_cors_response(status_code, body):
    """Create a response with CORS headers"""
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
            "Access-Control-Allow-Headers": "Content-Type",
        },
        "body": json.dumps(body)
    }

def validate_command(command):
    """Validate that the command is one of the allowed values"""
    valid_commands = [
        "RESTART",
        "TOGGLE_1_ON",
        "TOGGLE_1_OFF",
        "TOGGLE_2_ON",
        "TOGGLE_2_OFF",
        "SET_SPEED",
        "GET_STATE"
    ]
    return command in valid_commands

def store_command(client_id, command, command_id, params=None):
    """Store command in DynamoDB with pending status"""
    try:
        item = {
            'command_id': command_id,
            'client_id': client_id,
            'command': command,
            'status': 'pending',
            'timestamp': datetime.utcnow().isoformat(),
            'ttl': int(time.time()) + 300  # TTL of 5 minutes
        }
        if params:
            item['params'] = params
        
        command_responses_table.put_item(Item=item)
    except Exception as e:
        print(f"Error storing command: {str(e)}")

def get_device_state(client_id):
    """Get the latest state for a device"""
    try:
        response = device_states_table.get_item(
            Key={
                'client_id': client_id
            }
        )
        return response.get('Item')
    except Exception as e:
        print(f"Error getting device state: {str(e)}")
        return None

def lambda_handler(event, context):
    print("Received event:", json.dumps(event, indent=2))

    # Handle CORS preflight request
    if event.get("httpMethod") == "OPTIONS":
        return create_cors_response(200, {"message": "CORS preflight successful"})

    try:
        # Check if this is a GET request for device state
        if event.get("httpMethod") == "GET":
            if "state" in event.get("path", ""):
                client_id = event.get("queryStringParameters", {}).get("client_id")
                if not client_id:
                    return create_cors_response(400, {"error": "Missing client_id"})
                
                state = get_device_state(client_id)
                if not state:
                    return create_cors_response(404, {"error": "Device state not found"})
                
                return create_cors_response(200, {"state": state})

        # Handle command sending (POST request)
        if "body" in event:
            body = json.loads(event["body"])
        else:
            body = event

        client_id = body.get("client_id")
        command = body.get("command")

        if not client_id or not command:
            return create_cors_response(400, {
                "error": "Missing client_id or command"
            })

        # Validate the command
        if not validate_command(command):
            return create_cors_response(400, {
                "error": f"Invalid command. Must be one of: {', '.join(valid_commands)}"
            })

        # Generate unique command ID
        command_id = f"{client_id}-{int(time.time() * 1000)}"

        # Handle SET_SPEED command parameters
        params = None
        if command == "SET_SPEED":
            if "speed" not in body:
                return create_cors_response(400, {
                    "error": "Missing speed value for SET_SPEED command"
                })
            params = {"speed": body["speed"]}

        # Store command in DynamoDB
        store_command(client_id, command, command_id, params)

        # Define MQTT topics based on device's topic structure
        command_topic = f"NBtechv1/{client_id}/cmd"

        # Prepare message payload
        message = {
            "command": command,
            "command_id": command_id
        }
        if params:
            message.update(params)

        # Publish message to AWS IoT Core
        iot_client.publish(
            topic=command_topic,
            qos=1,
            payload=json.dumps(message)
        )
        print(f"Published to {command_topic}: {json.dumps(message)}")

        return create_cors_response(200, {
            "message": f"Command '{command}' sent successfully to device {client_id}",
            "command_id": command_id
        })

    except Exception as e:
        print("Error:", str(e))
        return create_cors_response(500, {
            "error": str(e)
        }) 