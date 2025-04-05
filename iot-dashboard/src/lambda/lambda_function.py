import json
import boto3
from datetime import datetime, timedelta
import logging
from decimal import Decimal
from statistics import mean
import time

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
device_data_table = dynamodb.Table('IoT_DeviceData')

# Maximum allowed time window in hours (changed to 24 hours = 1 day)
MAX_TIME_WINDOW = 24

# Custom JSON encoder to handle Decimal types
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

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
        'body': json.dumps(body, cls=DecimalEncoder)  # Use the custom encoder here
    }

def get_time_range_and_points(time_range, target_points=100):
    """Get start time and calculate interval for consistent points"""
    now = datetime.utcnow()
    if time_range == 'live':
        # For live data, return exactly 2 minutes of data with 20 points
        return now - timedelta(minutes=2), 20
    elif time_range == '15m':
        return now - timedelta(minutes=15), 50
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
        return now - timedelta(hours=24), target_points
    elif time_range == '2d':
        return now - timedelta(days=2), target_points * 2
    elif time_range == '3d':
        return now - timedelta(days=3), target_points * 2
    else:  # Default case
        return now - timedelta(hours=1), target_points

def validate_custom_time_range(start_time_str, end_time_str):
    """Validate custom time range and ensure it's within limits"""
    try:
        # Parse ISO format strings to datetime objects
        start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
        end_time = datetime.fromisoformat(end_time_str.replace('Z', '+00:00'))
        
        # Calculate time difference in hours
        time_diff = (end_time - start_time).total_seconds() / 3600
        
        # Check if end time is after start time
        if end_time <= start_time:
            return None, None, "End time must be after start time"
            
        # Check if time range exceeds maximum allowed window
        if time_diff > MAX_TIME_WINDOW:
            # Adjust end time to maintain maximum window
            end_time = start_time + timedelta(hours=MAX_TIME_WINDOW)
            return start_time, end_time, f"Time range limited to {MAX_TIME_WINDOW} hours (1 day)"
            
        return start_time, end_time, None
    except Exception as e:
        return None, None, f"Invalid date format: {str(e)}"

def fetch_data_in_chunks(client_id, start_time, end_time=None):
    """Fetch data in smaller chunks to prevent timeouts"""
    all_items = []
    last_evaluated_key = None
    query_count = 0
    total_scan_time = 0
    
    # For longer time periods, use larger chunks
    if end_time and (end_time - start_time).total_seconds() > 24 * 60 * 60:
        chunk_hours = 12  # 12-hour chunks for multi-day queries
    else:
        chunk_hours = 4  # 4-hour chunks for shorter queries
    
    current_start = start_time
    final_end = end_time or datetime.utcnow()
    
    while current_start < final_end:
        # Calculate chunk end time
        chunk_end = min(current_start + timedelta(hours=chunk_hours), final_end)
        logger.info(f"Fetching chunk from {current_start.isoformat()} to {chunk_end.isoformat()}")
        
        # Fetch this chunk
        chunk_items = []
        last_evaluated_key = None
        
        while True:
            query_start = time.time()
            query_count += 1
            
            if end_time:
                # Query with specific time range
                if last_evaluated_key:
                    response = device_data_table.query(
                        KeyConditionExpression='client_id = :client_id AND #ts BETWEEN :start_time AND :end_time',
                        ExpressionAttributeValues={
                            ':client_id': client_id,
                            ':start_time': current_start.isoformat(),
                            ':end_time': chunk_end.isoformat()
                        },
                        ExpressionAttributeNames={
                            '#ts': 'timestamp'
                        },
                        ExclusiveStartKey=last_evaluated_key,
                        Limit=1000
                    )
                else:
                    response = device_data_table.query(
                        KeyConditionExpression='client_id = :client_id AND #ts BETWEEN :start_time AND :end_time',
                        ExpressionAttributeValues={
                            ':client_id': client_id,
                            ':start_time': current_start.isoformat(),
                            ':end_time': chunk_end.isoformat()
                        },
                        ExpressionAttributeNames={
                            '#ts': 'timestamp'
                        },
                        Limit=1000
                    )
            else:
                # Query with only start time
                if last_evaluated_key:
                    response = device_data_table.query(
                        KeyConditionExpression='client_id = :client_id AND #ts >= :start_time',
                        ExpressionAttributeValues={
                            ':client_id': client_id,
                            ':start_time': current_start.isoformat()
                        },
                        ExpressionAttributeNames={
                            '#ts': 'timestamp'
                        },
                        ExclusiveStartKey=last_evaluated_key,
                        Limit=1000
                    )
                else:
                    response = device_data_table.query(
                        KeyConditionExpression='client_id = :client_id AND #ts >= :start_time',
                        ExpressionAttributeValues={
                            ':client_id': client_id,
                            ':start_time': current_start.isoformat()
                        },
                        ExpressionAttributeNames={
                            '#ts': 'timestamp'
                        },
                        Limit=1000
                    )
            
            query_time = time.time() - query_start
            total_scan_time += query_time
            
            # Process results
            if 'Items' in response:
                chunk_items.extend(response['Items'])
            
            # Check if we need to paginate
            last_evaluated_key = response.get('LastEvaluatedKey')
            if not last_evaluated_key or len(chunk_items) >= 5000:  # Limit to prevent timeout
                break
        
        # Add chunk items to all_items
        all_items.extend(chunk_items)
        
        # Move to next chunk
        current_start = chunk_end
    
    logger.info(f"Total items fetched: {len(all_items)} in {query_count} queries. Scan time: {total_scan_time:.2f}s")
    return all_items

def is_numeric(value):
    """Check if a value can be converted to a number"""
    if value is None:
        return False
    try:
        float(value)
        return True
    except (ValueError, TypeError):
        return False

def adaptive_aggregation(items, target_points, time_range_hours):
    """Aggregate data with dynamic strategy based on time range"""
    if not items:
        return []
    
    # For few items, return as is
    if len(items) <= target_points:
        return sorted(items, key=lambda x: x['timestamp'])
    
    # Sort items by timestamp
    sorted_items = sorted(items, key=lambda x: x['timestamp'])
    
    # For very large datasets (3 days), use more aggressive aggregation
    if time_range_hours > 48:
        # For 3 days, use more aggressive downsampling
        # Either select every Nth item or group by time buckets
        items_per_group = max(1, len(sorted_items) // target_points)
        
        # Use time-based buckets for more even distribution
        start_time = datetime.fromisoformat(sorted_items[0]['timestamp'].replace('Z', '+00:00'))
        end_time = datetime.fromisoformat(sorted_items[-1]['timestamp'].replace('Z', '+00:00'))
        
        # Calculate bucket size in seconds
        total_seconds = (end_time - start_time).total_seconds()
        bucket_seconds = total_seconds / target_points
        
        # Create time buckets
        buckets = {}
        for item in sorted_items:
            item_time = datetime.fromisoformat(item['timestamp'].replace('Z', '+00:00'))
            bucket_index = int((item_time - start_time).total_seconds() / bucket_seconds)
            
            if bucket_index not in buckets:
                buckets[bucket_index] = []
            
            buckets[bucket_index].append(item)
    else:
        # For shorter ranges, use item-based grouping
        items_per_group = max(1, len(sorted_items) // target_points)
        
        # Group items
        buckets = {}
        for i, item in enumerate(sorted_items):
            bucket_index = i // items_per_group
            if bucket_index not in buckets:
                buckets[bucket_index] = []
            buckets[bucket_index].append(item)
    
    # Explicitly exclude 'device' and other non-numeric fields
    excluded_fields = {'timestamp', 'client_id', 'user_email', 'device', 'modem', 'firmware'}
    metrics = [key for key in sorted_items[0].keys() if key not in excluded_fields]
    
    # Check if each metric is numeric across first few items
    numeric_metrics = {}
    sample_items = sorted_items[:min(10, len(sorted_items))]
    for metric in metrics:
        numeric_metrics[metric] = all(is_numeric(item.get(metric)) for item in sample_items if metric in item)
    
    # Aggregate each bucket
    processed_data = []
    for bucket_items in buckets.values():
        if not bucket_items:
            continue
            
        # Use the last timestamp in the group
        avg_point = {'timestamp': bucket_items[-1]['timestamp']}
        
        # Process each metric
        for metric in metrics:
            if numeric_metrics[metric]:
                # Numeric metrics: calculate average
                try:
                    # Filter out non-numeric values as a safeguard
                    values = [float(item.get(metric, 0)) for item in bucket_items 
                              if metric in item and is_numeric(item.get(metric))]
                    if values:
                        avg_point[metric] = round(sum(values) / len(values), 2)
                    else:
                        avg_point[metric] = 0
                except (ValueError, TypeError):
                    avg_point[metric] = 0
            else:
                # String metrics: use the most common value
                values = [str(item.get(metric, '')) for item in bucket_items if metric in item]
                if values:
                    # Most frequent value (mode)
                    value_counts = {}
                    for val in values:
                        value_counts[val] = value_counts.get(val, 0) + 1
                    most_common = max(value_counts.items(), key=lambda x: x[1])[0]
                    avg_point[metric] = most_common
                else:
                    avg_point[metric] = ''
                
        processed_data.append(avg_point)
        
        # Enforce maximum points
        if len(processed_data) >= target_points:
            break
            
    return processed_data

def calculate_summary_statistics(data, metrics):
    """Calculate summary statistics for all metrics"""
    summary = {
        'data_points': len(data),
        'original_points': len(data),
        'target_points': len(data)
    }
    
    # Identify numeric metrics
    numeric_metrics = {}
    for metric in metrics:
        numeric_metrics[metric] = all(is_numeric(item.get(metric)) for item in data[:min(10, len(data))] if metric in item)
    
    for metric in metrics:
        if numeric_metrics[metric]:
            # Handle numeric metrics
            values = [float(item.get(metric, 0)) for item in data 
                      if metric in item and is_numeric(item.get(metric))]
            if values:
                summary[f'avg_{metric}'] = round(mean(values), 2)
                summary[f'min_{metric}'] = round(min(values), 2)
                summary[f'max_{metric}'] = round(max(values), 2)
                summary[f'latest_{metric}'] = round(values[-1], 2)
        else:
            # Handle string metrics
            latest_value = data[-1].get(metric, '') if data else ''
            summary[f'latest_{metric}'] = latest_value
            # Don't calculate min/max/avg for strings
    
    return summary

def lambda_handler(event, context):
    """Main Lambda handler function"""
    start_time_total = time.time()
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

        # Process different time range types
        time_range = body.get('time_range', '1h')
        target_points = body.get('points', 100)
        warning_message = None
        
        # Handle custom date range
        if time_range == 'custom':
            if 'start_time' not in body or 'end_time' not in body:
                return create_cors_response(400, {'error': 'Custom time range requires start_time and end_time'})
                
            # Validate and potentially adjust the custom time range
            start_time, end_time, error = validate_custom_time_range(body['start_time'], body['end_time'])
            
            if error and not start_time:
                return create_cors_response(400, {'error': error})
                
            if error:  # We have a warning but valid times
                warning_message = error
                
            # Calculate time range in hours for aggregation
            time_range_hours = (end_time - start_time).total_seconds() / 3600
            
            # Adjust target points based on time range
            if time_range_hours > 48:  # For 3 days
                target_points = min(150, target_points * 2)  # More points but not too many
            elif time_range_hours > 24:  # For 1-2 days
                target_points = min(120, target_points * 1.5)
                
            points = target_points
        else:
            # Use standard time ranges
            start_time, points = get_time_range_and_points(time_range, target_points)
            end_time = None  # Current time as end time
            
            # Calculate time range in hours for aggregation
            if time_range == '3d':
                time_range_hours = 72
            elif time_range == '2d':
                time_range_hours = 48
            elif time_range == '24h':
                time_range_hours = 24
            else:
                time_range_hours = 0
        
        logger.info(f"Query parameters: start_time={start_time.isoformat()}, end_time={end_time.isoformat() if end_time else 'now'}, points={points}")
        
        # Use optimized fetch function for all queries
        items = fetch_data_in_chunks(body['client_id'], start_time, end_time)
        
        if not items:
            return create_cors_response(200, {
                'data': [],
                'summary': {
                    'data_points': 0,
                    'original_points': 0,
                    'target_points': target_points,
                    'warning': warning_message
                }
            })

        # Log item count for monitoring performance
        item_count = len(items)
        logger.info(f"Retrieved {item_count} items from DynamoDB")
        
        # For larger datasets, use more efficient processing
        original_count = item_count

        # Get all available metrics from the first item, excluding specific fields
        excluded_fields = {'timestamp', 'client_id', 'user_email'}
        metrics = [key for key in items[0].keys() if key not in excluded_fields]

        # Aggregate the data with appropriate strategy
        processed_data = adaptive_aggregation(items, points, time_range_hours)
        
        # Calculate summary statistics
        summary = calculate_summary_statistics(processed_data, metrics)
        summary['original_points'] = original_count
        
        # Add the latest complete data point to the summary for easy access
        summary['latest'] = processed_data[-1] if processed_data else {}
        
        # Add warning if applicable
        if warning_message:
            summary['warning'] = warning_message

        logger.info(f"Processed {len(processed_data)} points from {original_count} original points")
        
        total_execution_time = time.time() - start_time_total
        logger.info(f"Total lambda execution time: {total_execution_time:.2f}s")
        
        return create_cors_response(200, {
            'data': processed_data,
            'summary': summary
        })

    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return create_cors_response(500, {'error': f'Internal server error: {str(e)}'}) 