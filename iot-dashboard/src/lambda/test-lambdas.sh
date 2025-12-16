#!/bin/bash

# Lambda Test Script
# Tests all three Lambda functions via API Gateway

API_BASE="https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com"
CLIENT_ID="sim7080_updated"

echo "🧪 Testing Lambda Functions via API Gateway"
echo "============================================"
echo ""

echo "1️⃣ Testing fetch-device-shadow-state..."
echo "----------------------------------------"
curl -X POST \
  "$API_BASE/default/fetch-device-shadow-state" \
  -H 'Content-Type: application/json' \
  -d "{\"client_id\": \"$CLIENT_ID\"}" \
  -w "\nHTTP Status: %{http_code}\n" \
  | jq '.' 2>/dev/null || cat
echo ""

echo "2️⃣ Testing update-device-shadow (OUT1 ON)..."
echo "----------------------------------------"
curl -X POST \
  "$API_BASE/default/update-device-shadow" \
  -H 'Content-Type: application/json' \
  -d "{\"client_id\": \"$CLIENT_ID\", \"desired_state\": {\"OUT1\": 1}}" \
  -w "\nHTTP Status: %{http_code}\n" \
  | jq '.' 2>/dev/null || cat
echo ""

echo "3️⃣ Testing update-device-shadow (Set Motor Speed)..."
echo "----------------------------------------"
curl -X POST \
  "$API_BASE/default/update-device-shadow" \
  -H 'Content-Type: application/json' \
  -d "{\"client_id\": \"$CLIENT_ID\", \"desired_state\": {\"motor_speed\": 150}}" \
  -w "\nHTTP Status: %{http_code}\n" \
  | jq '.' 2>/dev/null || cat
echo ""

echo "4️⃣ Testing send-command (RESTART)..."
echo "----------------------------------------"
curl -X POST \
  "$API_BASE/default/send-command" \
  -H 'Content-Type: application/json' \
  -d "{\"client_id\": \"$CLIENT_ID\", \"command\": \"RESTART\"}" \
  -w "\nHTTP Status: %{http_code}\n" \
  | jq '.' 2>/dev/null || cat
echo ""

echo "5️⃣ Testing send-command (GET_STATE)..."
echo "----------------------------------------"
curl -X POST \
  "$API_BASE/default/send-command" \
  -H 'Content-Type: application/json' \
  -d "{\"client_id\": \"$CLIENT_ID\", \"command\": \"GET_STATE\"}" \
  -w "\nHTTP Status: %{http_code}\n" \
  | jq '.' 2>/dev/null || cat
echo ""

echo "✅ All tests complete!"
echo ""
echo "💡 Note: Replace 'default' with your actual API Gateway stage name if different"
echo "💡 Note: Replace 'sim7080_updated' with your actual Thing name if different"

