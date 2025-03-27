import json
import boto3
from boto3.dynamodb.conditions import Key
from datetime import datetime
from decimal import Decimal

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
device_data_table = dynamodb.Table('IoT_DeviceData')

def cors_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
            'Access-Control-Allow-Credentials': 'true'
        },
        'body': json.dumps(body)
    }

def decimal_to_float(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    return obj

def lambda_handler(event, context):
    debug_logs = []
    debug_logs.append(f"Received event: {json.dumps(event)}")
    
    # Handle OPTIONS request for CORS
    if event.get('httpMethod') == 'OPTIONS':
        return cors_response(200, {})
    
    try:
        # Parse body
        body = event.get('body')
        if body is None:
            # If body is None, use the event itself as the body
            body = event
        elif isinstance(body, str):
            body = json.loads(body)
        
        debug_logs.append(f"Parsed body: {json.dumps(body)}")
        
        # Get action from body
        action = body.get('action')
        debug_logs.append(f"Action: {action}")
        
        if not action:
            return cors_response(400, {
                'error': 'Missing action in request body',
                'debug_logs': debug_logs
            })
        
        if action == 'get_device_data':
            # Validate required fields
            required_fields = ['client_id']
            for field in required_fields:
                if field not in body:
                    return cors_response(400, {
                        'error': f'Missing required field: {field}',
                        'debug_logs': debug_logs
                    })
            
            # Get device data - most recent first
            response = device_data_table.query(
                KeyConditionExpression='device_id = :device_id',
                ExpressionAttributeValues={
                    ':device_id': body['client_id']
                },
                Limit=1,  # Get only the most recent data
                ScanIndexForward=False,  # Get in descending order (newest first)
                ProjectionExpression='device_id, #ts, battery, signal_quality, temperature, humidity',  # Use expression attribute name for timestamp
                ExpressionAttributeNames={
                    '#ts': 'timestamp'  # Map #ts to timestamp
                }
            )
            
            debug_logs.append(f"DynamoDB response: {json.dumps(response, default=decimal_to_float)}")
            
            if not response.get('Items'):
                debug_logs.append("No data found for device")
                return cors_response(200, {
                    'device_data': {
                        'battery_level': 0,
                        'signal_strength': 0,
                        'temperature': 0,
                        'humidity': 0,
                        'last_updated': datetime.utcnow().isoformat()
                    }
                })
            
            # Get the most recent data
            device_data = response['Items'][0]
            debug_logs.append(f"Most recent data: {json.dumps(device_data, default=decimal_to_float)}")
            
            return cors_response(200, {
                'device_data': {
                    'battery_level': float(device_data.get('battery', 0)),
                    'signal_strength': float(device_data.get('signal_quality', 0)),
                    'temperature': float(device_data.get('temperature', 0)),
                    'humidity': float(device_data.get('humidity', 0)),
                    'last_updated': device_data.get('timestamp', datetime.utcnow().isoformat())
                }
            })
            
        elif action == 'update_device_data':
            # Validate required fields
            required_fields = ['client_id', 'battery', 'signal_quality', 'temperature', 'humidity']
            for field in required_fields:
                if field not in body:
                    return cors_response(400, {
                        'error': f'Missing required field: {field}',
                        'debug_logs': debug_logs
                    })
            
            # Create new device data entry
            new_data = {
                'device_id': body['client_id'],
                'timestamp': datetime.utcnow().isoformat(),
                'battery': float(body['battery']),
                'ClientID': body['client_id'],
                'device': body.get('device_name', 'Unknown'),
                'signal_quality': float(body['signal_quality']),
                'temperature': float(body['temperature']),
                'humidity': float(body['humidity'])
            }
            
            debug_logs.append(f"Storing new data: {json.dumps(new_data)}")
            
            # Save to DynamoDB
            device_data_table.put_item(Item=new_data)
            
            return cors_response(200, {
                'message': 'Device data updated successfully',
                'device_data': new_data
            })
            
        else:
            return cors_response(400, {
                'error': f'Invalid action: {action}',
                'debug_logs': debug_logs
            })
        
    except Exception as e:
        debug_logs.append(f"Error: {str(e)}")
        return cors_response(500, {
            'error': str(e),
            'debug_logs': debug_logs
        }) 