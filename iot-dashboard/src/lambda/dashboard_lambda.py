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
        return now - timedelta(minutes=15), 15  # One point per minute for 15m
    elif time_range == '1h':
        return now - timedelta(hours=1), target_points
    elif time_range == '2h':
        return now - timedelta(hours=2), target_points
    elif time_range == '4h':
        return now - timedelta(hours=4), target_points
    elif time_range == '8h':
        return now - timedelta(hours=8), target_points
    elif time_range == '16h':
        return now - timedelta(hours=16), target_points
    elif time_range == '24h':
        # For 24h, use a larger sampling interval to reduce data points
        return now - timedelta(days=1), min(target_points, 200)  # Cap at 200 points for 24h
    else:  # Default case
        return now - timedelta(hours=1), target_points

def aggregate_data(items, target_points):
    """Aggregate data to achieve consistent number of points"""
    if not items:
        return []

    # Sort items by timestamp
    sorted_items = sorted(items, key=lambda x: x['timestamp'])
    
    # For large datasets, implement sampling
    if len(sorted_items) > target_points * 2:
        # Calculate sampling interval
        sample_interval = len(sorted_items) // (target_points * 2)
        sorted_items = sorted_items[::sample_interval]
    
    # Calculate number of items per group
    items_per_group = max(1, len(sorted_items) // target_points)
    
    processed_data = []
    current_group = []
    
    # Get all possible metrics from the first item, excluding specific fields
    excluded_fields = {'timestamp', 'client_id', 'user_email', 'device'}
    metrics = [key for key in sorted_items[0].keys() if key not in excluded_fields]
    
    for item in sorted_items:
        group_data = {}
        for metric in metrics:
            try:
                group_data[metric] = float(item.get(metric, 0))
            except (ValueError, TypeError):
                group_data[metric] = 0
        current_group.append(group_data)
        
        if len(current_group) >= items_per_group:
            # Calculate averages for all metrics
            avg_point = {'timestamp': item['timestamp']}
            for metric in metrics:
                values = [p[metric] for p in current_group]
                avg_point[metric] = round(mean(values), 2)
            processed_data.append(avg_point)
            current_group = []
    
    # Handle any remaining items
    if current_group:
        avg_point = {'timestamp': sorted_items[-1]['timestamp']}
        for metric in metrics:
            values = [p[metric] for p in current_group]
            avg_point[metric] = round(mean(values), 2)
        processed_data.append(avg_point)

    return processed_data

def calculate_summary_statistics(data, metrics):
    """Calculate summary statistics for all metrics"""
    summary = {
        'data_points': len(data),
        'original_points': len(data),
        'target_points': len(data)
    }
    
    for metric in metrics:
        values = [float(item.get(metric, 0)) for item in data]
        if values:
            summary[f'avg_{metric}'] = round(mean(values), 2)
            summary[f'min_{metric}'] = round(min(values), 2)
            summary[f'max_{metric}'] = round(max(values), 2)
            summary[f'latest_{metric}'] = round(values[-1], 2)
    
    return summary

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
        target_points = body.get('points', 100)
        start_time, points = get_time_range_and_points(time_range, target_points)
        
        # For 24h range, use a larger sampling interval in the query
        if time_range == '24h':
            # Query with a sampling interval of 5 minutes
            sampling_interval = 300  # 5 minutes in seconds
            response = device_data_table.query(
                KeyConditionExpression='client_id = :client_id AND #ts >= :start_time',
                ExpressionAttributeValues={
                    ':client_id': body['client_id'],
                    ':start_time': start_time.isoformat()
                },
                ExpressionAttributeNames={
                    '#ts': 'timestamp'
                },
                ScanIndexForward=True,
                FilterExpression='attribute_not_exists(#ts) OR mod(cast(#ts as number), :interval) = 0',
                ExpressionAttributeValues={
                    ':client_id': body['client_id'],
                    ':start_time': start_time.isoformat(),
                    ':interval': sampling_interval
                }
            )
        else:
            # Normal query for other time ranges
            response = device_data_table.query(
                KeyConditionExpression='client_id = :client_id AND #ts >= :start_time',
                ExpressionAttributeValues={
                    ':client_id': body['client_id'],
                    ':start_time': start_time.isoformat()
                },
                ExpressionAttributeNames={
                    '#ts': 'timestamp'
                },
                ScanIndexForward=True
            )

        if 'Items' not in response or not response['Items']:
            return create_cors_response(200, {
                'data': [],
                'summary': {
                    'data_points': 0,
                    'original_points': 0,
                    'target_points': target_points
                }
            })

        # Get all available metrics from the first item, excluding specific fields
        excluded_fields = {'timestamp', 'client_id', 'user_email'}
        metrics = [key for key in response['Items'][0].keys() 
                  if key not in excluded_fields]

        # Aggregate the data
        processed_data = aggregate_data(response['Items'], points)
        
        # Calculate summary statistics
        summary = calculate_summary_statistics(processed_data, metrics)
        
        # Add the latest complete data point to the summary for easy access
        summary['latest'] = processed_data[-1] if processed_data else {}

        logger.info(f"Processed {len(processed_data)} points from {len(response['Items'])} original points")
        logger.info(f"Summary statistics: {json.dumps(summary)}")

        return create_cors_response(200, {
            'data': processed_data,
            'summary': summary
        })

    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return create_cors_response(500, {'error': f'Internal server error: {str(e)}'}) 