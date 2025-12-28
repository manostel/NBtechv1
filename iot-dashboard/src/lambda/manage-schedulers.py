import json
import boto3
import logging
import time
import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from boto3.dynamodb.conditions import Key, Attr

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS resources
dynamodb = boto3.resource('dynamodb')
iot_data_client = boto3.client('iot-data')

tasks_table = dynamodb.Table('IoT_SchedulerTasks')

def decimal_default(obj):
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError

def get_cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Origin,X-Requested-With',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,DELETE',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json'
    }

def cors_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': get_cors_headers(),
        'body': json.dumps(body, default=decimal_default)
    }

# --- Cron Logic ---

def calculate_next_run(task_type, cron_str, from_time=None):
    """
    Calculates the next execution timestamp.
    Supports:
      - One-time: ISO Date string
      - Recurring:
          1. Every X mins: */m * * * *
          2. Hourly: m */h * * *
          3. Daily: m h * * *
          4. Weekly: m h * * d,d,d
          5. Monthly: m h D * *
    """
    if from_time is None:
        from_time = datetime.now(timezone.utc)
    else:
        # Ensure from_time is aware UTC
        if from_time.tzinfo is None:
             from_time = from_time.replace(tzinfo=timezone.utc)

    if task_type == 'one_time':
        try:
            dt = datetime.fromisoformat(cron_str.replace('Z', '+00:00'))
            if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
            return dt.timestamp()
        except ValueError:
            return None

    elif task_type == 'recurring':
        try:
            parts = cron_str.split(' ')
            if len(parts) < 5: return None
            
            minute_str, hour_str, dom_str, month_str, dow_str = parts[0:5]
            
            # 1. Every X minutes: */15 * * * *
            if minute_str.startswith('*/'):
                interval = int(minute_str.split('/')[1])
                # Round up to next interval
                now_minute = from_time.minute
                remainder = now_minute % interval
                delta_mins = interval - remainder
                
                candidate = from_time.replace(second=0, microsecond=0) + timedelta(minutes=delta_mins)
                if candidate <= from_time:
                    candidate += timedelta(minutes=interval)
                return candidate.timestamp()

            # 2. Hourly: m */h * * *
            if hour_str.startswith('*/'):
                interval = int(hour_str.split('/')[1])
                target_minute = int(minute_str)
                
                for h_offset in range(0, 48): # Check 2 days ahead
                    check_time = from_time + timedelta(hours=h_offset)
                    if check_time.hour % interval == 0:
                         candidate = check_time.replace(minute=target_minute, second=0, microsecond=0)
                         if candidate > from_time:
                             return candidate.timestamp()
                return None

            # 3. Daily: 30 14 * * *
            if dom_str == '*' and dow_str == '*':
                target_hour = int(hour_str)
                target_minute = int(minute_str)
                candidate = from_time.replace(hour=target_hour, minute=target_minute, second=0, microsecond=0)
                if candidate <= from_time:
                    candidate += timedelta(days=1)
                return candidate.timestamp()

            # 4. Weekly: 30 14 * * 1,3
            if dow_str != '*':
                target_hour = int(hour_str)
                target_minute = int(minute_str)
                target_days = [int(d) for d in dow_str.split(',')]
                
                candidate = from_time.replace(hour=target_hour, minute=target_minute, second=0, microsecond=0)
                
                for _ in range(14):
                    py_wd = candidate.weekday()
                    ui_wd = (py_wd + 1) % 7
                    
                    if ui_wd in target_days:
                        if candidate > from_time:
                            return candidate.timestamp()
                    
                    candidate += timedelta(days=1)
                    candidate = candidate.replace(hour=target_hour, minute=target_minute) 
                return None

            # 5. Monthly: 30 14 1 * *
            if dom_str != '*':
                target_dom = int(dom_str)
                target_hour = int(hour_str)
                target_minute = int(minute_str)
                
                try:
                    candidate = from_time.replace(day=target_dom, hour=target_hour, minute=target_minute, second=0, microsecond=0)
                    if candidate > from_time:
                        return candidate.timestamp()
                except ValueError:
                    pass 
                
                if from_time.month == 12:
                    next_month = from_time.replace(year=from_time.year+1, month=1, day=1)
                else:
                    next_month = from_time.replace(month=from_time.month+1, day=1)
                
                try:
                    candidate = next_month.replace(day=target_dom, hour=target_hour, minute=target_minute, second=0, microsecond=0)
                    return candidate.timestamp()
                except ValueError:
                    pass
                return None

            return None

        except Exception as e:
            logger.error(f"Calc error: {e}")
            return None
            
    return None

# --- Task Execution Logic ---

def execute_command(task):
    """
    Execute scheduled command by updating device shadow's DESIRED state.
    The device will receive a delta notification and apply the change.
    """
    try:
        device_id = task.get('device_id')
        command = task.get('command')
        target = task.get('target')
        value = task.get('value')
        
        if not device_id:
            logger.error("No device_id provided")
            return False
        
        # Get current shadow to merge with desired state
        try:
            response = iot_data_client.get_thing_shadow(thingName=device_id)
            shadow_document = json.loads(response['payload'].read())
            current_desired = shadow_document.get('state', {}).get('desired', {})
        except Exception as e:
            logger.warning(f"Could not get current shadow for {device_id}: {e}, starting fresh")
            current_desired = {}
        
        # Build desired state based on command
        desired_state = dict(current_desired)  # Copy current desired state
        
        # Map commands to shadow fields
        if command == "TOGGLE_1_ON":
            desired_state['OUT1'] = 1
        elif command == "TOGGLE_1_OFF":
            desired_state['OUT1'] = 0
        elif command == "TOGGLE_2_ON":
            desired_state['OUT2'] = 1
        elif command == "TOGGLE_2_OFF":
            desired_state['OUT2'] = 0
        elif command == "SET_SPEED":
            desired_state['motor_speed'] = int(value) if value is not None else 0
        elif command == "POWER_SAVING_ON":
            desired_state['power_saving'] = 1
        elif command == "POWER_SAVING_OFF":
            desired_state['power_saving'] = 0
        else:
            logger.warning(f"Unknown command: {command}")
            return False
        
        # Update shadow with new desired state
        shadow_update = {
            "state": {
                "desired": desired_state
            }
        }
        
        iot_data_client.update_thing_shadow(
            thingName=device_id,
            payload=json.dumps(shadow_update)
        )
        
        logger.info(f"✅ Updated shadow for {device_id}: {json.dumps(desired_state)}")
        return True
        
    except Exception as e:
        logger.error(f"Error executing command: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False

def send_sns_notification(task, success):
    """
    Invoke sns-notification Lambda to send push notification
    """
    try:
        lambda_client = boto3.client('lambda')
        
        task_name = task.get('name', 'Scheduled Task')
        device_id = task.get('device_id', 'Unknown')
        command = task.get('command', 'Unknown')
        status = "success" if success else "failed"
        
        message = f"Task '{task_name}' {status}: Executed {command} on {device_id}"
        subject = f"Scheduler {status.title()}: {device_id}"
        
        payload = {
            "action": "send_notification",
            "message": message,
            "subject": subject,
            "type": "scheduler_trigger",
            "data": {
                "task_id": task.get('task_id'),
                "device_id": device_id,
                "status": status,
                "task_name": task_name
            }
        }
        
        target_function = os.environ.get('SNS_NOTIFICATION_LAMBDA', 'sns-notification')
        
        lambda_client.invoke(
            FunctionName=target_function,
            InvocationType='Event',
            Payload=json.dumps(payload)
        )
        logger.info(f"Invoked SNS notification for task {task.get('task_id')}")
        
    except Exception as e:
        logger.error(f"Error sending SNS notification: {e}")

def process_scheduled_tasks():
    now_ts = int(time.time())
    try:
        response = tasks_table.query(
            IndexName='NextRunIndex',
            KeyConditionExpression=Key('enabled_status').eq('1') & Key('next_run_timestamp').lte(now_ts)
        )
        
        tasks = response.get('Items', [])
        for task in tasks:
            success = execute_command(task)
            
            # Send Push Notification
            send_sns_notification(task, success)
            
            user_email = task['user_email']
            task_id = task['task_id']
            
            update_expression = "SET last_run = :now, last_status = :status"
            expression_values = { ':now': now_ts, ':status': 'success' if success else 'failed' }
            
            if task['type'] == 'one_time':
                update_expression += ", enabled = :false, enabled_status = :status_disabled"
                expression_values[':false'] = False
                expression_values[':status_disabled'] = '0'
            elif task['type'] == 'recurring':
                next_ts = calculate_next_run(task['type'], task['schedule'], from_time=datetime.now(timezone.utc))
                if next_ts:
                    update_expression += ", next_run_timestamp = :next"
                    expression_values[':next'] = int(next_ts)
                else:
                    update_expression += ", enabled = :false, enabled_status = :status_disabled"
                    expression_values[':false'] = False
                    expression_values[':status_disabled'] = '0'
            
            tasks_table.update_item(
                Key={'user_email': user_email, 'task_id': task_id},
                UpdateExpression=update_expression,
                ExpressionAttributeValues=expression_values
            )
        return f"Processed {len(tasks)} tasks"
    except Exception as e:
        logger.error(f"Process error: {e}")
        return str(e)

# --- API Handlers ---

def create_task(user_email, task_data):
    task_id = f"task_{int(time.time())}_{hash(user_email) % 10000}"
    next_run = calculate_next_run(task_data['type'], task_data['schedule'])
    
    if not next_run:
        return False, "Invalid schedule or date in past"
        
    item = {
        'user_email': user_email,
        'task_id': task_id,
        'name': task_data.get('name', 'Untitled Task'),
        'device_id': task_data['device_id'],
        'command': task_data['command'],
        'target': task_data['target'],
        'value': task_data['value'],
        'type': task_data['type'],
        'schedule': task_data['schedule'],
        'enabled': task_data.get('enabled', True),
        'enabled_status': '1' if task_data.get('enabled', True) else '0',
        'next_run_timestamp': int(next_run),
        'created_at': int(time.time())
    }
    tasks_table.put_item(Item=item)
    return True, item

def get_tasks(user_email):
    response = tasks_table.query(KeyConditionExpression=Key('user_email').eq(user_email))
    return response.get('Items', [])

def update_task(user_email, task_id, task_data):
    next_run = calculate_next_run(task_data['type'], task_data['schedule'])
    if not next_run: return False, "Invalid schedule"

    update_expr = "SET #n = :name, device_id = :dev, command = :cmd, target = :tgt, #v = :val, #t = :type, schedule = :sch, enabled = :en, enabled_status = :est, next_run_timestamp = :next"
    
    tasks_table.update_item(
        Key={'user_email': user_email, 'task_id': task_id},
        UpdateExpression=update_expr,
        ExpressionAttributeNames={'#n': 'name', '#v': 'value', '#t': 'type'},
        ExpressionAttributeValues={
            ':name': task_data['name'],
            ':dev': task_data['device_id'],
            ':cmd': task_data['command'],
            ':tgt': task_data['target'],
            ':val': task_data['value'],
            ':type': task_data['type'],
            ':sch': task_data['schedule'],
            ':en': task_data['enabled'],
            ':est': '1' if task_data['enabled'] else '0',
            ':next': int(next_run)
        }
    )
    return True, "Updated"

def delete_task(user_email, task_id):
    tasks_table.delete_item(Key={'user_email': user_email, 'task_id': task_id})
    return True, "Deleted"

def toggle_task(user_email, task_id, enabled):
    if enabled:
        resp = tasks_table.get_item(Key={'user_email': user_email, 'task_id': task_id})
        if 'Item' not in resp: return False, "Task not found"
        item = resp['Item']
        next_run = calculate_next_run(item['type'], item['schedule'])
        if not next_run: return False, "Cannot enable: Invalid schedule"
        update_expr = "SET enabled = :en, enabled_status = :est, next_run_timestamp = :next"
        expr_vals = { ':en': True, ':est': '1', ':next': int(next_run) }
    else:
        update_expr = "SET enabled = :en, enabled_status = :est"
        expr_vals = { ':en': False, ':est': '0' }

    tasks_table.update_item(
        Key={'user_email': user_email, 'task_id': task_id},
        UpdateExpression=update_expr,
        ExpressionAttributeValues=expr_vals
    )
    return True, "Toggled"

def lambda_handler(event, context):
    logger.info("Received event: %s", json.dumps(event))
    
    if event.get('source') == 'aws.events':
        result = process_scheduled_tasks()
        return {'statusCode': 200, 'body': json.dumps({'message': result})}

    if event.get("httpMethod") == "OPTIONS":
        return {'statusCode': 200, 'headers': get_cors_headers(), 'body': json.dumps({"message": "CORS OK"})}

    try:
        body = json.loads(event['body']) if isinstance(event.get('body'), str) else event.get('body', {})
        action = body.get('action')
        user_email = body.get('user_email')

        if not action or not user_email: return cors_response(400, {'error': 'Missing parameters'})

        if action == 'create_task':
            success, result = create_task(user_email, body.get('task'))
            return cors_response(200 if success else 400, {'success': success, 'result': result})
        elif action == 'get_tasks':
            tasks = get_tasks(user_email)
            return cors_response(200, {'success': True, 'tasks': tasks})
        elif action == 'update_task':
            success, result = update_task(user_email, body.get('task_id'), body.get('task'))
            return cors_response(200 if success else 400, {'success': success, 'result': result})
        elif action == 'delete_task':
            success, result = delete_task(user_email, body.get('task_id'))
            return cors_response(200 if success else 400, {'success': success, 'result': result})
        elif action == 'toggle_task':
            success, result = toggle_task(user_email, body.get('task_id'), body.get('enabled'))
            return cors_response(200 if success else 400, {'success': success, 'result': result})
        
        return cors_response(400, {'error': 'Invalid action'})

    except Exception as e:
        logger.error(f"Handler error: {e}")
        return cors_response(500, {'error': str(e)})