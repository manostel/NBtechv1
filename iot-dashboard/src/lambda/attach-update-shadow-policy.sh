#!/bin/bash

# Configuration
LAMBDA_FUNCTION_NAME="update-device-shadow" # Replace with your Lambda function name
POLICY_NAME="UpdateDeviceShadowPolicy"
POLICY_FILE="update-device-shadow-iam-policy.json"
REGION="eu-central-1" # Replace with your AWS region

echo "🚀 Attaching IAM policy to Lambda execution role for '$LAMBDA_FUNCTION_NAME'..."

# 1. Get the Lambda function's execution role ARN
echo "1. Retrieving Lambda execution role ARN..."
ROLE_ARN=$(aws lambda get-function \
    --function-name $LAMBDA_FUNCTION_NAME \
    --region $REGION \
    --query 'Configuration.Role' \
    --output text 2>&1)

if [ $? -ne 0 ]; then
    echo "❌ Error retrieving Lambda role ARN. Please ensure the Lambda function '$LAMBDA_FUNCTION_NAME' exists and you have permissions."
    echo "Error details: $ROLE_ARN"
    exit 1
fi

# Extract role name from ARN
ROLE_NAME=$(echo $ROLE_ARN | rev | cut -d'/' -f1 | rev)

if [ -z "$ROLE_NAME" ]; then
    echo "❌ Could not extract role name from ARN: $ROLE_ARN"
    exit 1
fi

echo "✅ Found Lambda execution role: $ROLE_NAME (ARN: $ROLE_ARN)"

# 2. Create or update the inline policy
echo "2. Creating/Updating inline policy '$POLICY_NAME' for role '$ROLE_NAME'..."
aws iam put-role-policy \
    --role-name $ROLE_NAME \
    --policy-name $POLICY_NAME \
    --policy-document file://$POLICY_FILE \
    --region $REGION

if [ $? -ne 0 ]; then
    echo "❌ Error attaching policy '$POLICY_NAME' to role '$ROLE_NAME'."
    exit 1
fi

echo "✅ Policy '$POLICY_NAME' successfully attached to role '$ROLE_NAME'."
echo "Deployment complete. The Lambda function '$LAMBDA_FUNCTION_NAME' now has permissions to interact with AWS IoT Device Shadow."

