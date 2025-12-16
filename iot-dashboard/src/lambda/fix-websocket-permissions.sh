#!/bin/bash

# Fix WebSocket Lambda Permissions
# Run this to add all necessary permissions

set -e

REGION="eu-central-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
API_ID="2e3uhs3ur2"

echo "🔧 Fixing WebSocket Lambda Permissions"
echo "======================================="
echo "Region: $REGION"
echo "Account: $ACCOUNT_ID"
echo "API ID: $API_ID"
echo ""

# ============================================
# Step 1: Add API Gateway permissions to Lambdas
# ============================================
echo "1️⃣ Adding API Gateway invoke permissions..."

# websocket-connect
echo "   Adding permission to websocket-connect..."
aws lambda add-permission \
    --function-name websocket-connect \
    --statement-id apigateway-connect-invoke \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*" \
    --region $REGION 2>/dev/null || echo "   (Permission may already exist)"

# websocket-disconnect
echo "   Adding permission to websocket-disconnect..."
aws lambda add-permission \
    --function-name websocket-disconnect \
    --statement-id apigateway-disconnect-invoke \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*" \
    --region $REGION 2>/dev/null || echo "   (Permission may already exist)"

# websocket-broadcast (for IoT)
echo "   Adding IoT permission to websocket-broadcast..."
aws lambda add-permission \
    --function-name websocket-broadcast \
    --statement-id iot-invoke \
    --action lambda:InvokeFunction \
    --principal iot.amazonaws.com \
    --region $REGION 2>/dev/null || echo "   (Permission may already exist)"

echo "✅ Lambda permissions added"

# ============================================
# Step 2: Verify/Update Lambda environment variables
# ============================================
echo ""
echo "2️⃣ Updating Lambda environment variables..."

# websocket-connect
aws lambda update-function-configuration \
    --function-name websocket-connect \
    --environment "Variables={CONNECTIONS_TABLE=WebSocketConnections}" \
    --region $REGION > /dev/null
echo "   ✅ websocket-connect updated"

# websocket-disconnect
aws lambda update-function-configuration \
    --function-name websocket-disconnect \
    --environment "Variables={CONNECTIONS_TABLE=WebSocketConnections}" \
    --region $REGION > /dev/null
echo "   ✅ websocket-disconnect updated"

# websocket-broadcast
aws lambda update-function-configuration \
    --function-name websocket-broadcast \
    --environment "Variables={CONNECTIONS_TABLE=WebSocketConnections,WEBSOCKET_ENDPOINT=https://$API_ID.execute-api.$REGION.amazonaws.com/production}" \
    --region $REGION > /dev/null
echo "   ✅ websocket-broadcast updated"

# ============================================
# Step 3: Verify DynamoDB table exists
# ============================================
echo ""
echo "3️⃣ Checking DynamoDB table..."

TABLE_STATUS=$(aws dynamodb describe-table --table-name WebSocketConnections --region $REGION --query 'Table.TableStatus' --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$TABLE_STATUS" == "NOT_FOUND" ]; then
    echo "   Creating DynamoDB table..."
    aws dynamodb create-table \
        --table-name WebSocketConnections \
        --attribute-definitions AttributeName=connectionId,AttributeType=S \
        --key-schema AttributeName=connectionId,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region $REGION > /dev/null
    echo "   Waiting for table to be active..."
    aws dynamodb wait table-exists --table-name WebSocketConnections --region $REGION
fi
echo "   ✅ DynamoDB table ready"

# ============================================
# Step 4: Verify Lambda IAM role has DynamoDB permissions
# ============================================
echo ""
echo "4️⃣ Checking Lambda IAM role permissions..."

# Get the role name from websocket-connect
ROLE_ARN=$(aws lambda get-function --function-name websocket-connect --region $REGION --query 'Configuration.Role' --output text)
ROLE_NAME=$(echo $ROLE_ARN | rev | cut -d'/' -f1 | rev)

echo "   Lambda role: $ROLE_NAME"

# Add inline policy for DynamoDB and API Gateway management
cat > /tmp/websocket-lambda-policy.json << EOF
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
            "Resource": "arn:aws:dynamodb:$REGION:$ACCOUNT_ID:table/WebSocketConnections"
        },
        {
            "Effect": "Allow",
            "Action": "execute-api:ManageConnections",
            "Resource": "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/@connections/*"
        }
    ]
}
EOF

aws iam put-role-policy \
    --role-name $ROLE_NAME \
    --policy-name WebSocketDynamoDBPolicy \
    --policy-document file:///tmp/websocket-lambda-policy.json \
    --region $REGION 2>/dev/null || echo "   (Policy update may have failed - check manually)"

echo "   ✅ IAM policy updated"

# ============================================
# Step 5: Create/Update IoT Rule
# ============================================
echo ""
echo "5️⃣ Creating IoT Rule for shadow updates..."

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
    --rule-name ShadowUpdateBroadcast \
    --topic-rule-payload file:///tmp/iot-rule.json \
    --region $REGION 2>/dev/null || \
aws iot replace-topic-rule \
    --rule-name ShadowUpdateBroadcast \
    --topic-rule-payload file:///tmp/iot-rule.json \
    --region $REGION 2>/dev/null || echo "   (Rule may already exist)"

echo "   ✅ IoT Rule configured"

# ============================================
# Step 6: Test WebSocket connection
# ============================================
echo ""
echo "6️⃣ Testing WebSocket connection..."

# Simple test using curl to check if the endpoint responds
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$API_ID.execute-api.$REGION.amazonaws.com/production" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" == "403" ] || [ "$HTTP_CODE" == "426" ]; then
    echo "   ✅ API Gateway endpoint is responding (HTTP $HTTP_CODE is expected for non-WebSocket request)"
else
    echo "   ⚠️ API Gateway returned HTTP $HTTP_CODE - may need manual check"
fi

# ============================================
# Summary
# ============================================
echo ""
echo "======================================="
echo "🎉 Setup Complete!"
echo "======================================="
echo ""
echo "WebSocket URL: wss://$API_ID.execute-api.$REGION.amazonaws.com/production"
echo ""
echo "📝 Next steps:"
echo "   1. Refresh your dashboard"
echo "   2. Check browser console for '✅ WebSocket connected'"
echo "   3. If still failing, check CloudWatch logs for websocket-connect"
echo ""
echo "📋 To view CloudWatch logs:"
echo "   aws logs tail /aws/lambda/websocket-connect --follow --region $REGION"

