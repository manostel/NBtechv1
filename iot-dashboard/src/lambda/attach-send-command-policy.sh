#!/bin/bash

# Script to attach IAM policy to Lambda execution role for send-command Lambda
# This grants permissions to update Device Shadows and publish MQTT messages

LAMBDA_FUNCTION_NAME="send-command"
REGION="eu-central-1"
POLICY_NAME="SendCommandDeviceShadowPolicy"

echo "🔐 Attaching IAM policy for Device Shadow operations..."

# Get the Lambda function's execution role ARN
echo "📋 Getting Lambda execution role..."
LAMBDA_ROLE_ARN=$(aws lambda get-function \
    --function-name $LAMBDA_FUNCTION_NAME \
    --region $REGION \
    --query 'Configuration.Role' \
    --output text 2>/dev/null)

if [ -z "$LAMBDA_ROLE_ARN" ]; then
    echo "❌ Error: Could not find Lambda function '$LAMBDA_FUNCTION_NAME'"
    echo "   Make sure the function exists and you have permissions to access it."
    exit 1
fi

echo "✅ Found Lambda role: $LAMBDA_ROLE_ARN"

# Extract role name from ARN (format: arn:aws:iam::ACCOUNT:role/ROLE_NAME)
ROLE_NAME=$(echo $LAMBDA_ROLE_ARN | awk -F'/' '{print $NF}')
echo "📝 Role name: $ROLE_NAME"

# Attach the inline policy
echo "🔧 Attaching inline policy '$POLICY_NAME' to role '$ROLE_NAME'..."
aws iam put-role-policy \
    --role-name $ROLE_NAME \
    --policy-name $POLICY_NAME \
    --policy-document file://send-command-iam-policy.json \
    --region $REGION

if [ $? -eq 0 ]; then
    echo "✅ Policy attached successfully!"
    echo ""
    echo "📋 Summary:"
    echo "   - Lambda Function: $LAMBDA_FUNCTION_NAME"
    echo "   - Execution Role: $ROLE_NAME"
    echo "   - Policy: $POLICY_NAME"
    echo "   - Permissions:"
    echo "     • iot:UpdateThingShadow (for state commands)"
    echo "     • iot:GetThingShadow (for GET_STATE command)"
    echo "     • iot:Publish (for RESTART command)"
    echo ""
    echo "🧪 Test the Lambda function now!"
else
    echo "❌ Error: Failed to attach policy"
    exit 1
fi

