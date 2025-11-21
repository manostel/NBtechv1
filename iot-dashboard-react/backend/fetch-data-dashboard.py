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

# Maximum allowed time window in hours
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
        'body': json.dumps(body, cls=DecimalEncoder)
    }

def get_step_size(time_range):
    """Get the step size for a given time range"""
    if time_range == 'live':
        return timedelta(minutes=1)  # 1-minute step
    elif time_range == '15m':
        return timedelta(minutes=1)  # 1-minute step
    elif time_range == '1h':
        return timedelta(minutes=1)  # 1-minute step
    elif time_range == '2h':
        return timedelta(minutes=2)  # 2-minute step
    elif time_range == '4h':
        return timedelta(minutes=3)  # 3-minute step
    elif time_range == '8h':
        return timedelta(minutes=4)  # 4-minute step
    elif time_range == '16h':
        return timedelta(minutes=5)  # 5-minute step
    elif time_range == '24h':
        return timedelta(minutes=30)  # 30-minute step (was 15)
    elif time_range == '3d':
        return timedelta(hours=2)  # 2-hour step (was 130 minutes)
    elif time_range == '7d':
        return timedelta(hours=6)  # 6-hour step (was 3 hours)
    elif time_range == '30d':
        return timedelta(hours=12)  # 12-hour step (was 5 hours)
    else:
        return timedelta(minutes=1)  # Default to 1-minute step

def get_time_range_and_points(time_range, target_points=100):
    """Get start time and calculate interval for consistent points"""
    now = datetime.utcnow()
    step = get_step_size(time_range)
    
    if time_range == 'live':
        return now - timedelta(minutes=2), 20
    elif time_range == '15m':
        return now - timedelta(minutes=15), 15
    elif time_range == '1h':
        return now - timedelta(hours=1), 60
    elif time_range == '2h':
        return now - timedelta(hours=2), 120
    elif time_range == '4h':
        return now - timedelta(hours=4), 240
    elif time_range == '8h':
        return now - timedelta(hours=8), 480
    elif time_range == '16h':
        return now - timedelta(hours=16), 960
    elif time_range == '24h':
        return now - timedelta(hours=24), 96
    elif time_range == '3d':
        return now - timedelta(days=3), 144
    elif time_range == '7d':
        return now - timedelta(days=7), 168
    elif time_range == '30d':
        return now - timedelta(days=30), 360
    else:
        return now - timedelta(hours=1), 60

def get_last_timestamp(client_id):
    """Get the most recent timestamp for a given client_id"""
    try:
        logger.info(f"Querying for last timestamp of client_id: {client_id}")
        
        # Query the table to get the most recent item
        response = device_data_table.query(
            KeyConditionExpression='client_id = :client_id',
            ExpressionAttributeValues={
                ':client_id': client_id
            },
            ExpressionAttributeNames={
                '#ts': 'timestamp'
            },
            ScanIndexForward=False,  # Sort in descending order
            Limit=1  # Get only the most recent item
        )
        
        logger.info(f"Query response: {json.dumps(response)}")
        
        if response.get('Items') and len(response['Items']) > 0:
            last_item = response['Items'][0]
            logger.info(f"Found last timestamp for {client_id}: {last_item['timestamp']}")
            return last_item['timestamp']
        else:
            logger.warning(f"No data found for client_id {client_id}")
            return None
    except Exception as e:
        logger.error(f"Error getting last timestamp: {str(e)}")
        return None

def fetch_chunk(client_id, start_time, end_time, selected_variables, include_state):
    """Fetch data from DynamoDB for a specific time chunk"""
    try:
        # Calculate time step based on time range
        time_diff = end_time - start_time
        total_hours = time_diff.total_seconds() / 3600
        
        # Determine time range based on total hours
        if total_hours <= 0.25:  # 15 minutes
            time_range = '15m'
        elif total_hours <= 1:  # 1 hour
            time_range = '1h'
        elif total_hours <= 2:  # 2 hours
            time_range = '2h'
        elif total_hours <= 4:  # 4 hours
            time_range = '4h'
        elif total_hours <= 8:  # 8 hours
            time_range = '8h'
        elif total_hours <= 16:  # 16 hours
            time_range = '16h'
        elif total_hours <= 24:  # 24 hours
            time_range = '24h'
        elif total_hours <= 72:  # 3 days
            time_range = '3d'
        elif total_hours <= 168:  # 7 days
            time_range = '7d'
        else:  # 30 days
            time_range = '30d'
        
        step = get_step_size(time_range)
        num_points = int((end_time - start_time) / step)
        
        # Build the query
        query_params = {
            'TableName': 'iot_metrics',
            'KeyConditionExpression': 'client_id = :client_id AND timestamp BETWEEN :start AND :end',
            'ExpressionAttributeValues': {
                ':client_id': {'S': client_id},
                ':start': {'S': start_time.isoformat()},
                ':end': {'S': end_time.isoformat()}
            },
            'ScanIndexForward': True,
            'Limit': num_points
        }
        
        # Add state if requested
        if include_state:
            query_params['ProjectionExpression'] = 'timestamp, #state, ' + ', '.join(selected_variables)
            query_params['ExpressionAttributeNames'] = {'#state': 'state'}
        else:
            query_params['ProjectionExpression'] = 'timestamp, ' + ', '.join(selected_variables)
        
        # Execute the query
        response = dynamodb.query(**query_params)
        items = response.get('Items', [])
        
        # If we have more data, continue paginating
        while 'LastEvaluatedKey' in response:
            query_params['ExclusiveStartKey'] = response['LastEvaluatedKey']
            response = dynamodb.query(**query_params)
            items.extend(response.get('Items', []))
        
        return items
    except Exception as e:
        logger.error(f"Error fetching chunk: {str(e)}")
        raise

def fetch_data_in_chunks(client_id, start_time, end_time=None, selected_variables=None):
    """Fetch data in smaller chunks to prevent timeouts"""
    all_items = []
    last_evaluated_key = None
    query_count = 0
    total_scan_time = 0
    
    try:
        # Calculate time range in hours
        time_range_hours = (end_time - start_time).total_seconds() / 3600
        
        # Adjust chunk size based on time range
        if time_range_hours > 24 * 7:  # More than 7 days
            chunk_hours = 24  # 1-day chunks for very long ranges
        elif time_range_hours > 24:  # More than 1 day
            chunk_hours = 12  # 12-hour chunks for multi-day ranges
        else:
            chunk_hours = 4  # 4-hour chunks for shorter ranges
        
        current_start = start_time
        final_end = end_time or datetime.utcnow()
        
        logger.info(f"Starting data fetch for client_id: {client_id}")
        logger.info(f"Time range: {current_start.isoformat()} to {final_end.isoformat()}")
        logger.info(f"Selected variables: {selected_variables}")
        logger.info(f"Using chunk size of {chunk_hours} hours")
        
        while current_start < final_end:
            chunk_end = min(current_start + timedelta(hours=chunk_hours), final_end)
            logger.info(f"Fetching chunk from {current_start.isoformat()} to {chunk_end.isoformat()}")
            
            chunk_items = []
            last_evaluated_key = None
            
            while True:
                query_start = time.time()
                query_count += 1
                
                try:
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
                            ScanIndexForward=True,  # Get data in chronological order
                            Limit=1000  # Limit number of items per query
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
                            ScanIndexForward=True,  # Get data in chronological order
                            Limit=1000  # Limit number of items per query
                        )
                    
                    query_time = time.time() - query_start
                    total_scan_time += query_time
                    
                    items_count = len(response.get('Items', []))
                    logger.info(f"Query {query_count} returned {items_count} items in {query_time:.2f}s")
                    
                    if 'Items' in response:
                        # Filter items based on selected variables if provided
                        if selected_variables:
                            filtered_items = []
                            for item in response['Items']:
                                filtered_item = {
                                    'timestamp': item['timestamp'],
                                    'client_id': item['client_id']
                                }
                                for var in selected_variables:
                                    if var in item:
                                        filtered_item[var] = item[var]
                                filtered_items.append(filtered_item)
                            chunk_items.extend(filtered_items)
                        else:
                            chunk_items.extend(response['Items'])
                    
                    last_evaluated_key = response.get('LastEvaluatedKey')
                    if not last_evaluated_key:
                        break
                        
                except Exception as e:
                    logger.error(f"Error in query: {str(e)}")
                    break
            
            all_items.extend(chunk_items)
            current_start = chunk_end
            
            # Add a small delay between chunks to prevent throttling
            time.sleep(0.1)
        
        logger.info(f"Total items fetched: {len(all_items)} in {query_count} queries. Scan time: {total_scan_time:.2f}s")
        
        if not all_items:
            logger.warning(f"No data found for client_id: {client_id} in the specified time range")
            logger.warning(f"Query parameters: client_id={client_id}, start_time={start_time.isoformat()}, end_time={end_time.isoformat() if end_time else 'now'}")
        
        return all_items
        
    except Exception as e:
        logger.error(f"Error in fetch_data_in_chunks: {str(e)}")
        raise

def aggregate_data(items, target_points, selected_variables=None):
    """Aggregate data points to match target number of points"""
    if not items:
        return []
    
    # Sort items by timestamp
    sorted_items = sorted(items, key=lambda x: x['timestamp'])
    
    # Calculate time step based on time range
    start_time = datetime.fromisoformat(sorted_items[0]['timestamp'].replace('Z', '+00:00'))
    end_time = datetime.fromisoformat(sorted_items[-1]['timestamp'].replace('Z', '+00:00'))
    time_diff = end_time - start_time
    
    # Calculate total hours in the time range
    total_hours = time_diff.total_seconds() / 3600
    
    # Get step size based on total hours
    if total_hours <= 0.25:  # 15 minutes
        step = get_step_size('15m')
    elif total_hours <= 1:  # 1 hour
        step = get_step_size('1h')
    elif total_hours <= 2:  # 2 hours
        step = get_step_size('2h')
    elif total_hours <= 4:  # 4 hours
        step = get_step_size('4h')
    elif total_hours <= 8:  # 8 hours
        step = get_step_size('8h')
    elif total_hours <= 16:  # 16 hours
        step = get_step_size('16h')
    elif total_hours <= 24:  # 24 hours
        step = get_step_size('24h')
    elif total_hours <= 72:  # 3 days
        step = get_step_size('3d')
    elif total_hours <= 168:  # 7 days
        step = get_step_size('7d')
    else:  # 30 days
        step = get_step_size('30d')
    
    # Calculate number of intervals
    num_intervals = int((end_time - start_time) / step) + 1
    
    # Initialize aggregated data
    aggregated_data = []
    current_interval_start = start_time
    current_interval_items = []
    
    # Process items in chronological order
    for item in sorted_items:
        item_time = datetime.fromisoformat(item['timestamp'].replace('Z', '+00:00'))
        
        # If item is within current interval, add it to current interval items
        if item_time < current_interval_start + step:
            current_interval_items.append(item)
        else:
            # Process current interval if it has items
            if current_interval_items:
                # Calculate average values for the interval
                interval_data = {'timestamp': current_interval_start.isoformat() + 'Z'}
                for var in selected_variables:
                    values = [float(item[var]) for item in current_interval_items if var in item]
                    if values:
                        # Round to 2 decimal places
                        interval_data[var] = round(mean(values), 2)
                aggregated_data.append(interval_data)
            
            # Move to next interval
            current_interval_start = current_interval_start + step
            current_interval_items = [item]
    
    # Process the last interval
    if current_interval_items:
        interval_data = {'timestamp': current_interval_start.isoformat() + 'Z'}
        for var in selected_variables:
            values = [float(item[var]) for item in current_interval_items if var in item]
            if values:
                # Round to 2 decimal places
                interval_data[var] = round(mean(values), 2)
        aggregated_data.append(interval_data)
    
    # If we have more points than target, resample to match target
    if len(aggregated_data) > target_points:
        # Calculate new step size to match target points
        new_step = (end_time - start_time) / target_points
        resampled_data = []
        current_time = start_time
        
        for _ in range(target_points):
            # Find all points within the current interval
            interval_points = [point for point in aggregated_data 
                             if datetime.fromisoformat(point['timestamp'].replace('Z', '+00:00')) < current_time + new_step]
            
            if interval_points:
                # Calculate average values for the interval
                interval_data = {'timestamp': current_time.isoformat() + 'Z'}
                for var in selected_variables:
                    values = [point[var] for point in interval_points if var in point]
                    if values:
                        # Round to 2 decimal places
                        interval_data[var] = round(mean(values), 2)
                resampled_data.append(interval_data)
            
            current_time += new_step
        
        return resampled_data
    
    return aggregated_data

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
            # Round all statistics to 2 decimal places
            summary[f'avg_{metric}'] = round(mean(values), 2)
            summary[f'min_{metric}'] = round(min(values), 2)
            summary[f'max_{metric}'] = round(max(values), 2)
            summary[f'latest_{metric}'] = round(values[-1], 2)
    
    return summary

def lambda_handler(event, context):
    # Handle OPTIONS request for CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
                'Content-Type': 'application/json'
            },
            'body': ''
        }

    try:
        # Handle both direct input and API Gateway input formats
        if 'body' in event:
            # API Gateway format
            if isinstance(event['body'], str):
                body = json.loads(event['body'])
            else:
                body = event['body']
        else:
            # Direct input format
            body = event
            
        # Extract required fields
        action = body.get('action')
        client_id = body.get('client_id')
        time_range = body.get('time_range', '1h')
        points = body.get('points', 100)
        latest_timestamp = body.get('latest_timestamp')
        selected_variables = body.get('selected_variables', None)
        
        # Validate required fields
        if not all([action, client_id]):
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'error': 'Missing required fields',
                    'message': 'action and client_id are required'
                })
            }
            
        # Get the time range and points
        now = datetime.utcnow()
        if time_range == 'live':
            start_time = now - timedelta(minutes=2)
            target_points = 20
        elif time_range == '15m':
            start_time = now - timedelta(minutes=15)
            target_points = 15
        elif time_range == '1h':
            start_time = now - timedelta(hours=1)
            target_points = 60
        elif time_range == '2h':
            start_time = now - timedelta(hours=2)
            target_points = 120
        elif time_range == '4h':
            start_time = now - timedelta(hours=4)
            target_points = 240
        elif time_range == '8h':
            start_time = now - timedelta(hours=8)
            target_points = 480
        elif time_range == '16h':
            start_time = now - timedelta(hours=16)
            target_points = 960
        elif time_range == '24h':
            start_time = now - timedelta(hours=24)
            target_points = 96  # 4 points per hour
        elif time_range == '3d':
            start_time = now - timedelta(days=3)
            target_points = 144  # 2 points per hour
        elif time_range == '7d':
            start_time = now - timedelta(days=7)
            target_points = 168  # 1 point per hour
        elif time_range == '30d':
            start_time = now - timedelta(days=30)
            target_points = 360  # 1 point every 2 hours
        else:
            start_time = now - timedelta(hours=1)
            target_points = 60
            
        # If latest_timestamp is provided, use it as the end time
        if latest_timestamp:
            end_time = datetime.fromisoformat(latest_timestamp.replace('Z', '+00:00'))
            # Calculate start time based on the time range
            if time_range == '15m':
                start_time = end_time - timedelta(minutes=15)
            elif time_range == '1h':
                start_time = end_time - timedelta(hours=1)
            elif time_range == '2h':
                start_time = end_time - timedelta(hours=2)
            elif time_range == '4h':
                start_time = end_time - timedelta(hours=4)
            elif time_range == '8h':
                start_time = end_time - timedelta(hours=8)
            elif time_range == '16h':
                start_time = end_time - timedelta(hours=16)
            elif time_range == '24h':
                start_time = end_time - timedelta(hours=24)
            elif time_range == '3d':
                start_time = end_time - timedelta(days=3)
            elif time_range == '7d':
                start_time = end_time - timedelta(days=7)
            elif time_range == '30d':
                start_time = end_time - timedelta(days=30)
            else:
                start_time = end_time - timedelta(hours=1)
        else:
            end_time = now
            
        # Fetch data from DynamoDB with selected variables
        items = fetch_data_in_chunks(client_id, start_time, end_time, selected_variables)
        
        if not items:
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'data': [],
                    'summary': {
                        'message': 'No data available for the selected time range',
                        'start_time': start_time.isoformat(),
                        'end_time': end_time.isoformat()
                    }
                })
            }
            
        # Aggregate data to achieve consistent number of points
        aggregated_data = aggregate_data(items, target_points, selected_variables)
        
        # Calculate summary statistics
        metrics_to_summarize = selected_variables if selected_variables else [key for key in aggregated_data[0].keys() if key != 'timestamp']
        summary = calculate_summary_statistics(aggregated_data, metrics_to_summarize)
        
        # Return response with CORS headers
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'data': aggregated_data,
                'summary': summary
            })
        }
        
    except Exception as e:
        logger.error(f"Error in lambda_handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        } 