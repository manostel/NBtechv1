#!/bin/bash

# Create IoT_SubscriptionData table for subscription parameter tracking
# This prevents flooding the main IoT_DeviceData table

echo "Creating IoT_SubscriptionData table..."

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

echo "Waiting for table to be created..."
aws dynamodb wait table-exists --table-name IoT_SubscriptionData --region eu-central-1

echo "IoT_SubscriptionData table created successfully!"
echo ""
echo "Table structure:"
echo "- Primary Key: device_id (String) + parameter_name (String)"
echo "- TTL: Auto-delete after 7 days"
echo "- Purpose: Track last known parameter values for subscription change detection"
echo ""
echo "This will prevent the IoT_DeviceData table from being flooded with subscription data."
