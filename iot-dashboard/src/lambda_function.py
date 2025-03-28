import json
import boto3
from datetime import datetime, timedelta
import logging
from decimal import Decimal
from statistics import mean

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

def get_time_range_and_points(time_range, target_points=100):
    """Get start time and calculate interval for consistent points"""
    now = datetime.utcnow()
    if time_range == 'live':
        # For live data, return exactly 2 minutes of data with 20 points
        return now - timedelta(minutes=2), 20
    elif time_range == '15m':
        return now - timedelta(minutes=15), target_points
    elif time_range == '1h':
        return now - timedelta(hours=1), target_points
    elif time_range == '24h':
        return now - timedelta(days=1), target_points
    else:  # Default case
        return now - timedelta(hours=1), target_points

def aggregate_data(items, target_points):
    """Aggregate data to achieve consistent number of points"""
    if not items:
        return []

    # Sort items by timestamp
    sorted_items = sorted(items, key=lambda x: x['timestamp'])
    
    # Calculate number of items per group
    items_per_group = max(1, len(sorted_items) // target_points)
    
    processed_data = []
    current_group = []
    
    for item in sorted_items:
        current_group.append({
            'temperature': float(item.get('temperature', 0)),
            'humidity': float(item.get('humidity', 0)),
            'battery': float(item.get('battery', 0)),
            'signal_quality': float(item.get('signal_quality', 0))
        })
        
        if len(current_group) >= items_per_group:
            # Calculate averages for the group and round to 2 decimal places
            avg_point = {
                'timestamp': item['timestamp'],
                'temperature': round(mean([p['temperature'] for p in current_group]), 2),
                'humidity': round(mean([p['humidity'] for p in current_group]), 2),
                'battery': round(mean([p['battery'] for p in current_group]), 2),
                'signal_quality': round(mean([p['signal_quality'] for p in current_group]), 2)
            }
            processed_data.append(avg_point)
            current_group = []
    
    # Handle any remaining items
    if current_group:
        avg_point = {
            'timestamp': sorted_items[-1]['timestamp'],
            'temperature': round(mean([p['temperature'] for p in current_group]), 2),
            'humidity': round(mean([p['humidity'] for p in current_group]), 2),
            'battery': round(mean([p['battery'] for p in current_group]), 2),
            'signal_quality': round(mean([p['signal_quality'] for p in current_group]), 2)
        }
        processed_data.append(avg_point)

    return processed_data

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

        # Log the parsed body
        logger.info(f"Parsed body: {json.dumps(body)}")

        # Validate required fields
        if 'action' not in body:
            return create_cors_response(400, {'error': 'Missing action in request body'})
        
        if body['action'] != 'get_dashboard_data':
            return create_cors_response(400, {'error': f'Invalid action: {body["action"]}'})
        
        if 'client_id' not in body:
            return create_cors_response(400, {'error': 'Missing client_id in request body'})
        
        if 'user_email' not in body:
            return create_cors_response(400, {'error': 'Missing user_email in request body'})

        # Get time range and target points
        time_range = body.get('time_range', '1h')
        target_points = body.get('points', 100)  # Get points from request if specified
        start_time, points = get_time_range_and_points(time_range, target_points)
        
        # For live data, override target_points
        if time_range == 'live':
            target_points = 20  # Force 20 points for 2-minute window
        
        # Log the query parameters
        logger.info(f"Querying for device_id: {body['client_id']}")
        logger.info(f"Start time: {start_time.isoformat()}")
        logger.info(f"Time range: {time_range}")
        logger.info(f"Target points: {target_points}")

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
            logger.info("No data found for the specified criteria")
            return create_cors_response(200, {
                'data': [],
                'summary': {
                    'avg_temperature': 0,
                    'avg_humidity': 0,
                    'min_battery': 0,
                    'avg_signal': 0,
                    'data_points': 0,
                    'original_points': 0,
                    'target_points': target_points
                }
            })

        # Aggregate the data to target points
        processed_data = aggregate_data(response['Items'], target_points)
        
        # Calculate summary statistics from aggregated data
        temperatures = [item['temperature'] for item in processed_data]
        humidities = [item['humidity'] for item in processed_data]
        batteries = [item['battery'] for item in processed_data]
        signals = [item['signal_quality'] for item in processed_data]

        # Calculate summary with rounded values
        data_points = len(processed_data)
        summary = {
            'avg_temperature': round(mean(temperatures) if temperatures else 0, 2),
            'avg_humidity': round(mean(humidities) if humidities else 0, 2),
            'min_battery': round(min(batteries) if batteries else 0, 2),
            'avg_signal': round(mean(signals) if signals else 0, 2),
            'data_points': data_points,
            'original_points': len(response['Items']),
            'target_points': target_points
        }

        # Log the processed data and summary
        logger.info(f"Processed {data_points} points from {summary['original_points']} original points")
        logger.info(f"Summary statistics: {json.dumps(summary)}")

        return create_cors_response(200, {
            'data': processed_data,
            'summary': summary
        })

    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return create_cors_response(500, {'error': f'Internal server error: {str(e)}'}) 