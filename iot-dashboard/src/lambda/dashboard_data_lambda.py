import json
import boto3
from datetime import datetime, timedelta
import logging
from decimal import Decimal

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
device_data_table = dynamodb.Table('IoT_DeviceData')

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

def get_time_range(time_range):
    """Convert time range string to datetime objects"""
    now = datetime.utcnow()
    if time_range == '1h':
        return now - timedelta(hours=1)
    elif time_range == '24h':
        return now - timedelta(days=1)
    elif time_range == '7d':
        return now - timedelta(days=7)
    else:
        return now - timedelta(hours=1)  # Default to 1 hour

def lambda_handler(event, context):
    """Main Lambda handler function"""
    try:
        # Log the received event for debugging
        logger.info(f"Received event: {json.dumps(event)}")

        # Parse the request body
        if 'body' in event:
            body = json.loads(event['body'])
        else:
            body = event

        # Validate required fields
        if 'action' not in body:
            return create_cors_response(400, {'error': 'Missing action in request body'})
        
        if body['action'] != 'get_dashboard_data':
            return create_cors_response(400, {'error': f'Invalid action: {body["action"]}'})
        
        if 'client_id' not in body:
            return create_cors_response(400, {'error': 'Missing client_id in request body'})
        
        if 'user_email' not in body:
            return create_cors_response(400, {'error': 'Missing user_email in request body'})

        # Get time range from request or default to 1h
        time_range = body.get('time_range', '1h')
        start_time = get_time_range(time_range)

        # Get the device data from DynamoDB
        response = device_data_table.query(
            KeyConditionExpression='device_id = :device_id AND #ts >= :start_time',
            ExpressionAttributeValues={
                ':device_id': body['client_id'],
                ':start_time': start_time.isoformat()
            },
            ExpressionAttributeNames={
                '#ts': 'timestamp'
            },
            ScanIndexForward=True  # Get data in chronological order
        )

        # Check if we got any data
        if 'Items' not in response or not response['Items']:
            return create_cors_response(200, {
                'data': [],
                'summary': {
                    'avg_temperature': 0,
                    'avg_humidity': 0,
                    'min_battery': 0,
                    'avg_signal': 0,
                    'data_points': 0
                }
            })

        # Process the data
        items = response['Items']
        processed_data = []
        temperatures = []
        humidities = []
        batteries = []
        signals = []
        
        for item in items:
            # Convert Decimal types to float
            temperature = float(item.get('temperature', 0))
            humidity = float(item.get('humidity', 0))
            battery = float(item.get('battery', 0))
            signal = float(item.get('signal_quality', 0))
            
            processed_item = {
                'timestamp': item['timestamp'],
                'temperature': temperature,
                'humidity': humidity,
                'battery': battery,
                'signal_quality': signal
            }
            processed_data.append(processed_item)
            
            # Collect values for summary statistics
            temperatures.append(temperature)
            humidities.append(humidity)
            batteries.append(battery)
            signals.append(signal)

        # Calculate summary statistics
        data_points = len(processed_data)
        summary = {
            'avg_temperature': sum(temperatures) / data_points if data_points > 0 else 0,
            'avg_humidity': sum(humidities) / data_points if data_points > 0 else 0,
            'min_battery': min(batteries) if batteries else 0,
            'avg_signal': sum(signals) / data_points if data_points > 0 else 0,
            'data_points': data_points
        }

        # Log the response for debugging
        logger.info(f"Returning data: {json.dumps({'data': processed_data, 'summary': summary})}")

        return create_cors_response(200, {
            'data': processed_data,
            'summary': summary
        })

    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return create_cors_response(500, {'error': f'Internal server error: {str(e)}'}) 