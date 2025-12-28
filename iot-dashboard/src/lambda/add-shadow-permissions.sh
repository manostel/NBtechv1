#!/bin/bash

#!/bin/bash

# Script to add IoT Shadow access permissions to the subscription trigger Lambda
# This fixes the ForbiddenException when trying to read and update device shadows

LAMBDA_FUNCTION_NAME="iot-subscription-trigger"
AWS_REGION="eu-central-1"

echo "🔍 Finding Lambda function role..."

# Get the Lambda function's role ARN
ROLE_NAME=$(aws lambda get-function \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --region "$AWS_REGION" \
  --query 'Configuration.Role' \
  --output text | awk -F'/' '{print $NF}')

if [ -z "$ROLE_NAME" ]; then
  echo "❌ Could not find Lambda function: $LAMBDA_FUNCTION_NAME"
  echo "   Please check the function name and region"
  exit 1
fi

echo "✅ Found role: $ROLE_NAME"

# Create IAM policy document with both Get and Update permissions
POLICY_DOC=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iot:GetThingShadow",
        "iot:UpdateThingShadow"
      ],
      "Resource": "arn:aws:iot:*:*:thing/*"
    }
  ]
}
EOF
)

echo "📝 Adding IoT Shadow access policy (Get + Update)..."

# Add inline policy to the role
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "IoTShadowAccess" \
  --policy-document "$POLICY_DOC"

if [ $? -eq 0 ]; then
  echo "✅ Successfully added IoT Shadow access permissions!"
  echo ""
  echo "The Lambda can now:"
  echo "  - Read device shadows for state parameters (OUT1, OUT2, IN1, IN2, etc.)"
  echo "  - Update device shadows to execute subscription commands"
else
  echo "❌ Failed to add permissions. Please check your AWS credentials and permissions."
  exit 1
fi

