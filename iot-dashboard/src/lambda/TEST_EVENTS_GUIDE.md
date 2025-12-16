# Lambda Test Events Guide

This guide provides test events for all three Lambda functions, both for direct Lambda invocation and via API Gateway.

## API Gateway Base URL

```
https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com
```

## 1. fetch-device-shadow-state

### Purpose
Fetches the current device state from AWS IoT Device Shadow.

### API Gateway Test (cURL)

```bash
curl -X POST \
  https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch-device-shadow-state \
  -H 'Content-Type: application/json' \
  -d '{
    "client_id": "sim7080_updated"
  }'
```

### Lambda Console Test Event

```json
{
  "httpMethod": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"client_id\": \"sim7080_updated\"}"
}
```

### Direct Lambda Invoke (if not using API Gateway)

```json
{
  "client_id": "sim7080_updated"
}
```

### Expected Response

```json
{
  "statusCode": 200,
  "headers": {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type"
  },
  "body": "{\"message\": \"Device shadow state retrieved successfully\", \"state\": {\"client_id\": \"sim7080_updated\", \"timestamp\": 1678886400, \"out1_state\": 1, \"out2_state\": 0, \"motor_speed\": 150, \"power_saving\": 0, \"in1_state\": 0, \"in2_state\": 0, \"charging\": 0, \"connection_status\": \"connected\"}, \"source\": \"shadow\"}"
}
```

---

## 2. update-device-shadow

### Purpose
Updates the Device Shadow desired state directly. This is the **professional approach** - frontend specifies desired state, Lambda validates and updates Shadow.

### API Gateway Test (cURL)

#### Toggle OUT1 ON
```bash
curl -X POST \
  https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/update-device-shadow \
  -H 'Content-Type: application/json' \
  -d '{
    "client_id": "sim7080_updated",
    "desired_state": {
      "OUT1": 1
    }
  }'
```

#### Toggle OUT1 OFF
```bash
curl -X POST \
  https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/update-device-shadow \
  -H 'Content-Type: application/json' \
  -d '{
    "client_id": "sim7080_updated",
    "desired_state": {
      "OUT1": 0
    }
  }'
```

#### Toggle OUT2 ON
```bash
curl -X POST \
  https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/update-device-shadow \
  -H 'Content-Type: application/json' \
  -d '{
    "client_id": "sim7080_updated",
    "desired_state": {
      "OUT2": 1
    }
  }'
```

#### Set Motor Speed
```bash
curl -X POST \
  https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/update-device-shadow \
  -H 'Content-Type: application/json' \
  -d '{
    "client_id": "sim7080_updated",
    "desired_state": {
      "motor_speed": 150
    }
  }'
```

#### Power Saving ON
```bash
curl -X POST \
  https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/update-device-shadow \
  -H 'Content-Type: application/json' \
  -d '{
    "client_id": "sim7080_updated",
    "desired_state": {
      "power_saving": 1
    }
  }'
```

#### Multiple States at Once
```bash
curl -X POST \
  https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/update-device-shadow \
  -H 'Content-Type: application/json' \
  -d '{
    "client_id": "sim7080_updated",
    "desired_state": {
      "OUT1": 1,
      "OUT2": 0,
      "motor_speed": 200,
      "power_saving": 0
    }
  }'
```

### Lambda Console Test Events

#### Basic (Toggle OUT1 ON)
```json
{
  "httpMethod": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"client_id\": \"sim7080_updated\", \"desired_state\": {\"OUT1\": 1}}"
}
```

#### Set Motor Speed
```json
{
  "httpMethod": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"client_id\": \"sim7080_updated\", \"desired_state\": {\"motor_speed\": 150}}"
}
```

#### Multiple States
```json
{
  "httpMethod": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"client_id\": \"sim7080_updated\", \"desired_state\": {\"OUT1\": 1, \"OUT2\": 0, \"motor_speed\": 200, \"power_saving\": 0}}"
}
```

### Direct Lambda Invoke (if not using API Gateway)

```json
{
  "client_id": "sim7080_updated",
  "desired_state": {
    "OUT1": 1
  }
}
```

### Expected Response

```json
{
  "statusCode": 200,
  "headers": {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type"
  },
  "body": "{\"message\": \"Shadow desired state updated successfully\", \"thingName\": \"sim7080_updated\", \"desiredState\": {\"OUT1\": 1}, \"currentState\": {\"out1_state\": 0, \"out2_state\": 0, \"motor_speed\": 100, \"power_saving\": 0, \"in1_state\": 0, \"in2_state\": 0, \"charging\": 0, \"connection_status\": \"connected\"}, \"method\": \"shadow\"}"
}
```

---

## 3. send-command

### Purpose
Legacy command-based approach. **Note**: For state changes, use `update-device-shadow` instead. This is mainly for action commands like `RESTART`.

### API Gateway Test (cURL)

#### Toggle 1 ON (Legacy - Use update-device-shadow instead)
```bash
curl -X POST \
  https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/send-command \
  -H 'Content-Type: application/json' \
  -d '{
    "client_id": "sim7080_updated",
    "command": "TOGGLE_1_ON"
  }'
```

#### Toggle 1 OFF
```bash
curl -X POST \
  https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/send-command \
  -H 'Content-Type: application/json' \
  -d '{
    "client_id": "sim7080_updated",
    "command": "TOGGLE_1_OFF"
  }'
```

#### Toggle 2 ON
```bash
curl -X POST \
  https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/send-command \
  -H 'Content-Type: application/json' \
  -d '{
    "client_id": "sim7080_updated",
    "command": "TOGGLE_2_ON"
  }'
```

#### Set Speed
```bash
curl -X POST \
  https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/send-command \
  -H 'Content-Type: application/json' \
  -d '{
    "client_id": "sim7080_updated",
    "command": "SET_SPEED",
    "speed": 150
  }'
```

#### Power Saving ON
```bash
curl -X POST \
  https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/send-command \
  -H 'Content-Type: application/json' \
  -d '{
    "client_id": "sim7080_updated",
    "command": "POWER_SAVING_ON"
  }'
```

#### RESTART (Action Command - Use this Lambda)
```bash
curl -X POST \
  https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/send-command \
  -H 'Content-Type: application/json' \
  -d '{
    "client_id": "sim7080_updated",
    "command": "RESTART"
  }'
```

#### GET_STATE
```bash
curl -X POST \
  https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/send-command \
  -H 'Content-Type: application/json' \
  -d '{
    "client_id": "sim7080_updated",
    "command": "GET_STATE"
  }'
```

### Lambda Console Test Events

#### Toggle 1 ON
```json
{
  "httpMethod": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"client_id\": \"sim7080_updated\", \"command\": \"TOGGLE_1_ON\"}"
}
```

#### Set Speed
```json
{
  "httpMethod": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"client_id\": \"sim7080_updated\", \"command\": \"SET_SPEED\", \"speed\": 150}"
}
```

#### RESTART
```json
{
  "httpMethod": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"client_id\": \"sim7080_updated\", \"command\": \"RESTART\"}"
}
```

### Direct Lambda Invoke (if not using API Gateway)

```json
{
  "client_id": "sim7080_updated",
  "command": "TOGGLE_1_ON"
}
```

### Expected Response (State Command)

```json
{
  "statusCode": 200,
  "headers": {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type"
  },
  "body": "{\"message\": \"Command 'TOGGLE_1_ON' sent successfully via Device Shadow\", \"thingName\": \"sim7080_updated\", \"desiredState\": {\"OUT1\": 1}, \"currentState\": {\"out1_state\": 0, \"out2_state\": 0, \"motor_speed\": 100, \"power_saving\": 0, \"in1_state\": 0, \"in2_state\": 0, \"charging\": 0, \"connection_status\": \"connected\"}, \"method\": \"shadow\"}"
}
```

### Expected Response (RESTART - MQTT)

```json
{
  "statusCode": 200,
  "headers": {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type"
  },
  "body": "{\"message\": \"RESTART command sent successfully to device sim7080_updated\", \"method\": \"mqtt\"}"
}
```

---

## CORS Preflight Test

### API Gateway Test (cURL)

```bash
curl -X OPTIONS \
  https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/update-device-shadow \
  -H 'Origin: https://your-frontend-domain.com' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: Content-Type'
```

### Lambda Console Test Event

```json
{
  "httpMethod": "OPTIONS",
  "headers": {
    "Origin": "https://your-frontend-domain.com",
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "Content-Type"
  }
}
```

---

## Quick Test Script

Save this as `test-lambdas.sh`:

```bash
#!/bin/bash

API_BASE="https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com"
CLIENT_ID="sim7080_updated"

echo "🧪 Testing fetch-device-shadow-state..."
curl -X POST \
  "$API_BASE/default/fetch-device-shadow-state" \
  -H 'Content-Type: application/json' \
  -d "{\"client_id\": \"$CLIENT_ID\"}" \
  | jq '.'

echo -e "\n🧪 Testing update-device-shadow (OUT1 ON)..."
curl -X POST \
  "$API_BASE/default/update-device-shadow" \
  -H 'Content-Type: application/json' \
  -d "{\"client_id\": \"$CLIENT_ID\", \"desired_state\": {\"OUT1\": 1}}" \
  | jq '.'

echo -e "\n🧪 Testing send-command (RESTART)..."
curl -X POST \
  "$API_BASE/default/send-command" \
  -H 'Content-Type: application/json' \
  -d "{\"client_id\": \"$CLIENT_ID\", \"command\": \"RESTART\"}" \
  | jq '.'

echo -e "\n✅ All tests complete!"
```

Make it executable:
```bash
chmod +x test-lambdas.sh
./test-lambdas.sh
```

---

## Notes

1. **Replace `default` with your actual stage name** if different (e.g., `prod`, `dev`, `test`)
2. **Replace `sim7080_updated`** with your actual Thing name if different
3. **For production**, use proper authentication (API Keys, Cognito, etc.)
4. **For state changes**, prefer `update-device-shadow` over `send-command` (professional approach)
5. **For action commands** (RESTART), use `send-command`

