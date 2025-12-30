import json
import boto3

# Use the correct IoT Core Data Endpoint
iot_endpoint = "https://al047cml3y4l3-ats.iot.eu-central-1.amazonaws.com"
iot_client = boto3.client("iot-data", endpoint_url=iot_endpoint, region_name="eu-central-1")

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

def lambda_handler(event, context):
    """Update Device Shadow desired state directly"""
    print("Received event:", json.dumps(event, indent=2))

    # Handle CORS preflight request
    if event.get("httpMethod") == "OPTIONS":
        return create_cors_response(200, {"message": "CORS preflight successful"})

    try:
        # Parse request body
        if "body" in event:
            body = json.loads(event["body"])
        else:
            body = event

        client_id = body.get("client_id")
        desired_state = body.get("desired_state")
        
        if not client_id:
            return create_cors_response(400, {
                "error": "Missing client_id"
            })
        
        if not desired_state:
            return create_cors_response(400, {
                "error": "Missing desired_state"
            })

        # Validate desired_state is a dictionary
        if not isinstance(desired_state, dict):
            return create_cors_response(400, {
                "error": "desired_state must be a JSON object"
            })

        # Update Device Shadow with desired state
        shadow_payload = {
            "state": {
                "desired": desired_state
            }
        }
        
        try:
            response = iot_client.update_thing_shadow(
                thingName=client_id,
                payload=json.dumps(shadow_payload)
            )
            print(f"Updated shadow for {client_id}: {json.dumps(shadow_payload)}")
            
            # After updating shadow, fetch the current shadow state to return to frontend
            try:
                shadow_response = iot_client.get_thing_shadow(thingName=client_id)
                shadow_doc = json.loads(shadow_response['payload'].read())
                reported_state = shadow_doc.get("state", {}).get("reported", {})
                
                # Map shadow state to frontend format
                current_state = {
                    "out1_state": reported_state.get("OUT1", 0),
                    "out2_state": reported_state.get("OUT2", 0),
                    "motor_speed": reported_state.get("motor_speed", 0),
                    "power_saving": reported_state.get("power_saving", 0),
                    "in1_state": reported_state.get("IN1", 0),
                    "in2_state": reported_state.get("IN2", 0),
                    "charging": reported_state.get("charging", 0),
                    "connection_status": reported_state.get("connection_status", "unknown")
                }
            except Exception as shadow_error:
                print(f"Warning: Could not fetch shadow state after update: {str(shadow_error)}")
                current_state = None
            
            return create_cors_response(200, {
                "message": "Shadow desired state updated successfully",
                "thingName": client_id,
                "desiredState": desired_state,
                "currentState": current_state,  # Include current state for immediate UI update
                "method": "shadow"
            })
            
        except iot_client.exceptions.ResourceNotFoundException:
            return create_cors_response(404, {
                "error": f"Thing '{client_id}' not found in AWS IoT Core"
            })
        except Exception as e:
            print(f"Error updating shadow: {str(e)}")
            return create_cors_response(500, {
                "error": f"Failed to update shadow: {str(e)}"
            })

    except Exception as e:
        print("Error:", str(e))
        return create_cors_response(500, {
            "error": str(e)
        })

