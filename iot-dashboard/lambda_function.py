# Update the device_data_table query in the get_devices action
# Change this part in the get_devices action:
device_data_response = device_data_table.query(
    KeyConditionExpression='client_id = :client_id',  # Changed from device_id
    ExpressionAttributeValues={
        ':client_id': item['client_id']
    },
    Limit=1,
    ScanIndexForward=False
)

# Update the get_device_data action
elif action == 'get_device_data':
    # Validate required fields
    required_fields = ['client_id', 'user_email']
    for field in required_fields:
        if field not in body:
            return cors_response(400, {
                'error': f'Missing required field: {field}',
                'debug_logs': debug_logs
            })
    
    # Get device data - most recent first
    response = device_data_table.query(
        KeyConditionExpression='client_id = :client_id',  # Changed from device_id
        ExpressionAttributeValues={
            ':client_id': body['client_id']
        },
        Limit=1,  # Get only the most recent data
        ScanIndexForward=False  # Get in descending order (newest first)
    )

# Update the update_device_data action
elif action == 'update_device_data':
    # Validate minimum required fields
    required_fields = ['client_id', 'user_email']
    for field in required_fields:
        if field not in body:
            return cors_response(400, {
                'error': f'Missing required field: {field}',
                'debug_logs': debug_logs
            })
    
    # Create new device data entry dynamically
    new_data = {
        'client_id': body['client_id'],  # Changed from device_id
        'timestamp': datetime.utcnow().isoformat(),
        'user_email': body['user_email']
    }
    
    # Dynamically add all other fields from the request body
    for key, value in body.items():
        if key not in ['action', 'client_id', 'user_email', 'timestamp']:  # Removed device_id and ClientID
            # Convert numeric values to float
            if isinstance(value, (int, float, Decimal)):
                new_data[key] = float(value)
            else:
                new_data[key] = value 