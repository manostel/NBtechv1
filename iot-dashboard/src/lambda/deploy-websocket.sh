#!/bin/bash

# WebSocket Infrastructure Deployment Script
# Run this after creating the resources in AWS Console

REGION="eu-central-1"
CONNECTIONS_TABLE="WebSocketConnections"

echo "🚀 WebSocket Infrastructure Deployment"
echo "======================================="

# Step 1: Create DynamoDB Table
echo ""
echo "1️⃣ Creating DynamoDB table for WebSocket connections..."
aws dynamodb create-table \
    --table-name $CONNECTIONS_TABLE \
    --attribute-definitions AttributeName=connectionId,AttributeType=S \
    --key-schema AttributeName=connectionId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ DynamoDB table created: $CONNECTIONS_TABLE"
else
    echo "⚠️ Table may already exist or creation failed"
fi

# Step 2: Create Lambda functions (you need to zip and upload manually or use SAM/CDK)
echo ""
echo "2️⃣ Lambda functions to deploy:"
echo "   - websocket-connect.py"
echo "   - websocket-disconnect.py"
echo "   - websocket-broadcast.py"
echo ""
echo "   Deploy these manually in AWS Console or use:"
echo "   aws lambda create-function --function-name websocket-connect ..."

# Step 3: Create WebSocket API (manual step)
echo ""
echo "3️⃣ Create WebSocket API in API Gateway Console:"
echo "   - Go to API Gateway → Create API → WebSocket API"
echo "   - Name: DeviceShadowWebSocket"
echo "   - Route selection expression: \$request.body.action"
echo "   - Add routes: \$connect, \$disconnect"
echo "   - Link to Lambda functions"
echo "   - Deploy to 'production' stage"

# Step 4: Create IoT Rule
echo ""
echo "4️⃣ Create IoT Rule in AWS IoT Core Console:"
echo "   - Name: ShadowUpdateBroadcast"
echo "   - SQL: SELECT *, topic(3) as thingName FROM '\$aws/things/+/shadow/update/documents'"
echo "   - Action: Lambda → websocket-broadcast"

echo ""
echo "📝 After deployment, update these values:"
echo "   - WEBSOCKET_ENDPOINT in websocket-broadcast Lambda"
echo "   - WEBSOCKET_URL in frontend code"
echo ""
echo "Example WebSocket URL: wss://xxxxxx.execute-api.eu-central-1.amazonaws.com/production"

