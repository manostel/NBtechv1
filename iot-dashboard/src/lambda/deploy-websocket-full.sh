#!/bin/bash

# Full WebSocket Infrastructure Deployment via AWS CLI
# Run this script to deploy all WebSocket components

set -e

REGION="eu-central-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
CONNECTIONS_TABLE="WebSocketConnections"
API_NAME="DeviceShadowWebSocket"
STAGE_NAME="production"

echo "🚀 WebSocket Infrastructure Deployment"
echo "======================================="
echo "Region: $REGION"
echo "Account: $ACCOUNT_ID"
echo ""

# ============================================
# Step 1: Create DynamoDB Table
# ============================================
echo "1️⃣ Creating DynamoDB table..."
aws dynamodb create-table \
    --table-name $CONNECTIONS_TABLE \
    --attribute-definitions AttributeName=connectionId,AttributeType=S \
    --key-schema AttributeName=connectionId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION 2>/dev/null || echo "   Table may already exist"

echo "   Waiting for table to be active..."
aws dynamodb wait table-exists --table-name $CONNECTIONS_TABLE --region $REGION
echo "✅ DynamoDB table ready: $CONNECTIONS_TABLE"

# ============================================
# Step 2: Create IAM Role for Lambda
# ============================================
echo ""
echo "2️⃣ Creating IAM role for Lambda functions..."

ROLE_NAME="WebSocketLambdaRole"

# Trust policy for Lambda
cat > /tmp/trust-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "lambda.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

aws iam create-role \
    --role-name $ROLE_NAME \
    --assume-role-policy-document file:///tmp/trust-policy.json \
    --region $REGION 2>/dev/null || echo "   Role may already exist"

# Attach policies
cat > /tmp/websocket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:PutItem",
                "dynamodb:DeleteItem",
                "dynamodb:Scan",
                "dynamodb:GetItem"
            ],
            "Resource": "arn:aws:dynamodb:$REGION:$ACCOUNT_ID:table/$CONNECTIONS_TABLE"
        },
        {
            "Effect": "Allow",
            "Action": "execute-api:ManageConnections",
            "Resource": "arn:aws:execute-api:$REGION:$ACCOUNT_ID:*/*/@connections/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:*:*:*"
        }
    ]
}
EOF

aws iam put-role-policy \
    --role-name $ROLE_NAME \
    --policy-name WebSocketPolicy \
    --policy-document file:///tmp/websocket-policy.json \
    --region $REGION

ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME"
echo "✅ IAM role ready: $ROLE_ARN"

# Wait for role to propagate
echo "   Waiting for IAM role to propagate..."
sleep 10

# ============================================
# Step 3: Package and Deploy Lambda Functions
# ============================================
echo ""
echo "3️⃣ Deploying Lambda functions..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to deploy a Lambda
deploy_lambda() {
    local FUNC_NAME=$1
    local HANDLER=$2
    local SOURCE_FILE=$3
    
    echo "   Deploying $FUNC_NAME..."
    
    # Create zip
    cd /tmp
    cp "$SCRIPT_DIR/$SOURCE_FILE" lambda_function.py
    zip -q lambda.zip lambda_function.py
    
    # Check if function exists
    if aws lambda get-function --function-name $FUNC_NAME --region $REGION 2>/dev/null; then
        # Update existing function
        aws lambda update-function-code \
            --function-name $FUNC_NAME \
            --zip-file fileb://lambda.zip \
            --region $REGION > /dev/null
    else
        # Create new function
        aws lambda create-function \
            --function-name $FUNC_NAME \
            --runtime python3.9 \
            --handler lambda_function.lambda_handler \
            --role $ROLE_ARN \
            --zip-file fileb://lambda.zip \
            --timeout 30 \
            --environment "Variables={CONNECTIONS_TABLE=$CONNECTIONS_TABLE}" \
            --region $REGION > /dev/null
    fi
    
    rm -f lambda.zip lambda_function.py
    echo "   ✅ $FUNC_NAME deployed"
}

deploy_lambda "websocket-connect" "lambda_function.lambda_handler" "websocket-connect.py"
deploy_lambda "websocket-disconnect" "lambda_function.lambda_handler" "websocket-disconnect.py"
deploy_lambda "websocket-broadcast" "lambda_function.lambda_handler" "websocket-broadcast.py"

# ============================================
# Step 4: Create WebSocket API
# ============================================
echo ""
echo "4️⃣ Creating WebSocket API..."

# Create API
API_ID=$(aws apigatewayv2 create-api \
    --name $API_NAME \
    --protocol-type WEBSOCKET \
    --route-selection-expression '$request.body.action' \
    --region $REGION \
    --query 'ApiId' --output text 2>/dev/null || \
    aws apigatewayv2 get-apis --region $REGION \
    --query "Items[?Name=='$API_NAME'].ApiId" --output text)

echo "   API ID: $API_ID"

# Create integrations
echo "   Creating integrations..."

CONNECT_INTEGRATION=$(aws apigatewayv2 create-integration \
    --api-id $API_ID \
    --integration-type AWS_PROXY \
    --integration-uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$ACCOUNT_ID:function:websocket-connect/invocations" \
    --region $REGION \
    --query 'IntegrationId' --output text)

DISCONNECT_INTEGRATION=$(aws apigatewayv2 create-integration \
    --api-id $API_ID \
    --integration-type AWS_PROXY \
    --integration-uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$ACCOUNT_ID:function:websocket-disconnect/invocations" \
    --region $REGION \
    --query 'IntegrationId' --output text)

# Create routes
echo "   Creating routes..."

aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key '$connect' \
    --target "integrations/$CONNECT_INTEGRATION" \
    --region $REGION > /dev/null

aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key '$disconnect' \
    --target "integrations/$DISCONNECT_INTEGRATION" \
    --region $REGION > /dev/null

# Add Lambda permissions for API Gateway
echo "   Adding Lambda permissions..."

aws lambda add-permission \
    --function-name websocket-connect \
    --statement-id apigateway-connect \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*" \
    --region $REGION 2>/dev/null || true

aws lambda add-permission \
    --function-name websocket-disconnect \
    --statement-id apigateway-disconnect \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*" \
    --region $REGION 2>/dev/null || true

aws lambda add-permission \
    --function-name websocket-broadcast \
    --statement-id iot-rule-invoke \
    --action lambda:InvokeFunction \
    --principal iot.amazonaws.com \
    --region $REGION 2>/dev/null || true

# Deploy API
echo "   Deploying API to stage: $STAGE_NAME..."

aws apigatewayv2 create-stage \
    --api-id $API_ID \
    --stage-name $STAGE_NAME \
    --auto-deploy \
    --region $REGION > /dev/null 2>/dev/null || true

WEBSOCKET_URL="wss://$API_ID.execute-api.$REGION.amazonaws.com/$STAGE_NAME"
WEBSOCKET_ENDPOINT="https://$API_ID.execute-api.$REGION.amazonaws.com/$STAGE_NAME"

echo "✅ WebSocket API deployed"
echo "   URL: $WEBSOCKET_URL"

# Update broadcast Lambda with WebSocket endpoint
echo "   Updating websocket-broadcast with endpoint..."
aws lambda update-function-configuration \
    --function-name websocket-broadcast \
    --environment "Variables={CONNECTIONS_TABLE=$CONNECTIONS_TABLE,WEBSOCKET_ENDPOINT=$WEBSOCKET_ENDPOINT}" \
    --region $REGION > /dev/null

# ============================================
# Step 5: Create IoT Rule
# ============================================
echo ""
echo "5️⃣ Creating IoT Rule..."

IOT_RULE_NAME="ShadowUpdateBroadcast"

cat > /tmp/iot-rule.json << EOF
{
    "sql": "SELECT *, topic(3) as thingName FROM '\$aws/things/+/shadow/update/documents'",
    "actions": [
        {
            "lambda": {
                "functionArn": "arn:aws:lambda:$REGION:$ACCOUNT_ID:function:websocket-broadcast"
            }
        }
    ],
    "ruleDisabled": false,
    "awsIotSqlVersion": "2016-03-23"
}
EOF

aws iot create-topic-rule \
    --rule-name $IOT_RULE_NAME \
    --topic-rule-payload file:///tmp/iot-rule.json \
    --region $REGION 2>/dev/null || \
aws iot replace-topic-rule \
    --rule-name $IOT_RULE_NAME \
    --topic-rule-payload file:///tmp/iot-rule.json \
    --region $REGION

echo "✅ IoT Rule created: $IOT_RULE_NAME"

# ============================================
# Summary
# ============================================
echo ""
echo "======================================="
echo "🎉 Deployment Complete!"
echo "======================================="
echo ""
echo "📝 WebSocket URL (for frontend):"
echo "   $WEBSOCKET_URL"
echo ""
echo "📝 Add this to your frontend code:"
echo "   const WEBSOCKET_URL = '$WEBSOCKET_URL';"
echo ""
echo "📝 Test connection:"
echo "   wscat -c \"$WEBSOCKET_URL?client_id=sim7080_updated\""
echo ""

# Save config to file
cat > "$SCRIPT_DIR/websocket-config.json" << EOF
{
    "websocketUrl": "$WEBSOCKET_URL",
    "websocketEndpoint": "$WEBSOCKET_ENDPOINT",
    "apiId": "$API_ID",
    "region": "$REGION",
    "connectionsTable": "$CONNECTIONS_TABLE",
    "iotRuleName": "$IOT_RULE_NAME"
}
EOF

echo "📄 Config saved to: $SCRIPT_DIR/websocket-config.json"

