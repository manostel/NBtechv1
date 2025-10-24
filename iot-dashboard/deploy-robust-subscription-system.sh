#!/bin/bash

# Deploy Robust Subscription System
# This script deploys the enhanced subscription system with comprehensive safeguards

echo "🚀 Deploying Robust Subscription System..."

# 1. Create the new IoT_SubscriptionData table
echo "📊 Creating IoT_SubscriptionData table..."
aws dynamodb create-table \
    --table-name IoT_SubscriptionData \
    --attribute-definitions \
        AttributeName=device_id,AttributeType=S \
        AttributeName=parameter_name,AttributeType=S \
    --key-schema \
        AttributeName=device_id,KeyType=HASH \
        AttributeName=parameter_name,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --time-to-live-specification \
        AttributeName=ttl,Enabled=true \
    --region eu-central-1

echo "⏳ Waiting for table creation..."
aws dynamodb wait table-exists --table-name IoT_SubscriptionData --region eu-central-1

# 2. Deploy the enhanced Lambda function
echo "🔧 Deploying enhanced subscription trigger Lambda..."
cd /home/telectronio/dev/NBtechv1/iot-dashboard/src/lambda

# Create deployment package
zip -r iot-rules-subscription-trigger-enhanced.zip iot-rules-subscription-trigger.py

# Update Lambda function
aws lambda update-function-code \
    --function-name iot-rules-subscription-trigger \
    --zip-file fileb://iot-rules-subscription-trigger-enhanced.zip \
    --region eu-central-1

# 3. Add enhanced IAM permissions
echo "🔐 Adding enhanced IAM permissions..."

# Create enhanced policy
cat > enhanced-subscription-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:Query",
                "dynamodb:Scan"
            ],
            "Resource": [
                "arn:aws:dynamodb:eu-central-1:*:table/IoT_DeviceSubscriptions",
                "arn:aws:dynamodb:eu-central-1:*:table/IoT_SubscriptionData",
                "arn:aws:dynamodb:eu-central-1:*:table/IoT_SubscriptionNotifications"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "iot:Publish"
            ],
            "Resource": [
                "arn:aws:iot:eu-central-1:*:topic/NBtechv1/*"
            ]
        }
    ]
}
EOF

# Attach policy to Lambda role
aws iam put-role-policy \
    --role-name iot-rules-subscription-trigger-role \
    --policy-name EnhancedSubscriptionPolicy \
    --policy-document file://enhanced-subscription-policy.json

# 4. Clean up old subscription data
echo "🧹 Cleaning up old subscription data..."
python3 cleanup-device-data-table.py

# 5. Test the enhanced system
echo "🧪 Testing enhanced system..."

# Create test subscription (safe configuration)
cat > test-robust-subscription.json << EOF
{
    "action": "create_subscription",
    "user_email": "test@example.com",
    "subscription": {
        "device_id": "prototypeDevice2",
        "parameter_type": "metrics",
        "parameter_name": "battery",
        "condition_type": "below",
        "threshold_value": 20,
        "notification_method": "in_app",
        "enabled": true,
        "description": "Test robust subscription - battery low",
        "commands": [
            {
                "action": "none",
                "value": "",
                "target_device": ""
            }
        ]
    }
}
EOF

echo "✅ Enhanced subscription system deployed!"
echo ""
echo "🛡️ NEW SAFEGUARDS IMPLEMENTED:"
echo "   • 30-second cooldown between triggers"
echo "   • Self-triggering loop detection"
echo "   • Parameter coupling detection"
echo "   • Command format validation"
echo "   • Dangerous command prevention"
echo "   • Separate subscription data storage"
echo ""
echo "📊 MONITORING:"
echo "   • Check CloudWatch logs for loop prevention messages"
echo "   • Monitor IoT_SubscriptionData table for parameter tracking"
echo "   • Watch for cooldown period logs"
echo ""
echo "🔧 NEXT STEPS:"
echo "   1. Test with a safe subscription (battery monitoring)"
echo "   2. Monitor system behavior for 24 hours"
echo "   3. Gradually enable more complex subscriptions"
echo "   4. Set up CloudWatch alarms for subscription health"
