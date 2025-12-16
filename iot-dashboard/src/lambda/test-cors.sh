#!/bin/bash

# Test CORS configuration for Lambda functions

API_BASE="https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com"

echo "🧪 Testing CORS Configuration"
echo "=============================="
echo ""

echo "1️⃣ Testing OPTIONS request to fetch-device-shadow-state..."
curl -X OPTIONS \
  "$API_BASE/default/fetch-device-shadow-state" \
  -H 'Origin: http://localhost:3000' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: Content-Type' \
  -v 2>&1 | grep -E "(HTTP|Access-Control)"
echo ""

echo "2️⃣ Testing OPTIONS request to update-device-shadow..."
curl -X OPTIONS \
  "$API_BASE/default/update-device-shadow" \
  -H 'Origin: http://localhost:3000' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: Content-Type' \
  -v 2>&1 | grep -E "(HTTP|Access-Control)"
echo ""

echo "✅ CORS test complete!"
echo ""
echo "Expected: HTTP/1.1 200 OK with Access-Control-Allow-Origin header"
echo "If you see 403, CORS is not enabled in API Gateway"

