import json
import boto3
from datetime import datetime

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
device_states_table = dynamodb.Table('IoT_DeviceStates')

def create_cors_response(status_code, body):
    """Create a response with CORS headers"""
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
            'Content-Type': 'application/json'
        },
        'body': json.dumps(body)
    }

def lambda_handler(event, context):
    """Main Lambda handler function"""
    try:
        # Log the received event for debugging
        print(f"Received event: {json.dumps(event)}")

        # Handle CORS preflight request
        if event.get("httpMethod") == "OPTIONS":
            return create_cors_response(200, {"message": "CORS preflight successful"})

        # For GET requests - fetch device status
        if event.get("httpMethod") == "GET":
            client_id = event.get("queryStringParameters", {}).get("client_id")
            if not client_id:
                return create_cors_response(400, {"error": "Missing client_id parameter"})

            try:
                response = device_states_table.get_item(
                    Key={
                        'client_id': client_id
                    }
                )
                
                if 'Item' not in response:
                    return create_cors_response(404, {
                        "error": f"No status found for device {client_id}"
                    })

                return create_cors_response(200, {
                    "status": response['Item']
                })

            except Exception as e:
                print(f"Error fetching device status: {str(e)}")
                return create_cors_response(500, {
                    "error": f"Failed to fetch device status: {str(e)}"
                })

        # For POST requests - update device status
        if event.get("httpMethod") == "POST":
            # Parse the request body
            if 'body' in event:
                body = json.loads(event['body'])
            else:
                body = event

            # Validate required fields
            if 'client_id' not in body:
                return create_cors_response(400, {"error": "Missing client_id in request"})

            if 'outputs' not in body:
                return create_cors_response(400, {"error": "Missing outputs in request"})

            # Store the status update
            try:
                device_states_table.put_item(
                    Item={
                        'client_id': body['client_id'],
                        'timestamp': datetime.utcnow().isoformat(),
                        'outputs': body['outputs'],
                        'last_seen': datetime.utcnow().isoformat()
                    }
                )

                return create_cors_response(200, {
                    "message": f"Status updated for device {body['client_id']}"
                })

            except Exception as e:
                print(f"Error storing device status: {str(e)}")
                return create_cors_response(500, {
                    "error": f"Failed to store device status: {str(e)}"
                })

        return create_cors_response(400, {"error": "Invalid request method"})

    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return create_cors_response(500, {"error": f"Internal server error: {str(e)}"}) 