#!/bin/bash

# Configuration
TABLE_NAME="IoT_SchedulerTasks"
LAMBDA_NAME="manage-scheduler" # Ensure this matches your deployed Lambda function name
RULE_NAME="IoT_Scheduler_Ticker"
REGION="eu-central-1" # Change if needed

echo "deploying Scheduler Infrastructure to $REGION..."

# 1. Create DynamoDB Table
echo "1. Creating DynamoDB Table: $TABLE_NAME..."
aws dynamodb create-table \
    --table-name $TABLE_NAME \
    --attribute-definitions \
        AttributeName=user_email,AttributeType=S \
        AttributeName=task_id,AttributeType=S \
        AttributeName=enabled_status,AttributeType=S \
        AttributeName=next_run_timestamp,AttributeType=N \
    --key-schema \
        AttributeName=user_email,KeyType=HASH \
        AttributeName=task_id,KeyType=RANGE \
    --global-secondary-indexes \
        "[
            {
                \"IndexName\": \"NextRunIndex\",
                \"KeySchema\": [
                    {\"AttributeName\":\"enabled_status\",\"KeyType\":\"HASH\"},
                    {\"AttributeName\":\"next_run_timestamp\",\"KeyType\":\"RANGE\"}
                ],
                \"Projection\": {
                    \"ProjectionType\":\"ALL\"
                }
            }
        ]" \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION

echo "Waiting for table to be active..."
aws dynamodb wait table-exists --table-name $TABLE_NAME --region $REGION

# 2. Create EventBridge Rule
echo "2. Creating EventBridge Rule: $RULE_NAME..."
# Schedule: Run every 1 minute
aws events put-rule \
    --name $RULE_NAME \
    --schedule-expression "rate(1 minute)" \
    --state ENABLED \
    --description "Triggers the IoT Scheduler Lambda every minute to check for due tasks" \
    --region $REGION

# 3. Add Target to Rule
echo "3. Linking Rule to Lambda..."
# Get Lambda ARN
LAMBDA_ARN=$(aws lambda get-function --function-name $LAMBDA_NAME --query 'Configuration.FunctionArn' --output text --region $REGION)

if [ -z "$LAMBDA_ARN" ]; then
    echo "Error: Lambda function '$LAMBDA_NAME' not found. Please deploy the lambda code first."
    exit 1
fi

aws events put-targets \
    --rule $RULE_NAME \
    --targets "Id"="1","Arn"="$LAMBDA_ARN" \
    --region $REGION

# 4. Add Permission for EventBridge to Invoke Lambda
echo "4. Granting invoke permission..."
aws lambda add-permission \
    --function-name $LAMBDA_NAME \
    --statement-id "EventBridgeInvoke_${RULE_NAME}" \
    --action 'lambda:InvokeFunction' \
    --principal events.amazonaws.com \
    --source-arn "arn:aws:events:$REGION:$(aws sts get-caller-identity --query Account --output text):rule/$RULE_NAME" \
    --region $REGION

echo "✅ Scheduler Infrastructure Deployed Successfully!"
echo "   - DynamoDB Table: $TABLE_NAME"
echo "   - EventBridge Rule: $RULE_NAME (1 min rate)"
echo "   - Lambda Target: $LAMBDA_NAME"

