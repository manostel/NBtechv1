import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Divider,
  Alert,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Info as InfoIcon,
  AttachMoney as MoneyIcon,
  Speed as SpeedIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';

export default function SubscriptionCostInfo({ userLimits }) {
  const calculateMonthlyCost = () => {
    const subscriptions = userLimits.current_subscriptions || 0;
    const maxSubscriptions = userLimits.max_subscriptions || 5;
    
    // AWS IoT Core Rules Engine costs
    const ruleEvaluationsPerMonth = subscriptions * 1000; // Assume 1000 evaluations per subscription per month
    const ruleCost = (ruleEvaluationsPerMonth / 1000000) * 1.00; // $1.00 per million evaluations
    
    // Lambda execution costs
    const lambdaInvocationsPerMonth = ruleEvaluationsPerMonth;
    const lambdaCost = (lambdaInvocationsPerMonth / 1000000) * 0.20; // $0.20 per million requests
    
    // DynamoDB costs
    const dynamoReadsPerMonth = subscriptions * 100; // 100 reads per subscription per month
    const dynamoWritesPerMonth = subscriptions * 50; // 50 writes per subscription per month
    const dynamoCost = ((dynamoReadsPerMonth + dynamoWritesPerMonth) / 1000000) * 0.25; // $0.25 per million operations
    
    const totalCost = ruleCost + lambdaCost + dynamoCost;
    
    return {
      ruleCost: ruleCost,
      lambdaCost: lambdaCost,
      dynamoCost: dynamoCost,
      totalCost: totalCost,
      ruleEvaluations: ruleEvaluationsPerMonth,
      lambdaInvocations: lambdaInvocationsPerMonth,
      dynamoOperations: dynamoReadsPerMonth + dynamoWritesPerMonth
    };
  };

  const costBreakdown = calculateMonthlyCost();

  return (
    <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <MoneyIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" component="h3">
          Cost Estimation
        </Typography>
        <Tooltip title="Estimated monthly costs based on current subscription usage">
          <IconButton size="small">
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            IoT Rules Engine
          </Typography>
          <Typography variant="h6" color="primary">
            ${costBreakdown.ruleCost.toFixed(4)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {costBreakdown.ruleEvaluations.toLocaleString()} evaluations/month
          </Typography>
        </Box>

        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Lambda Execution
          </Typography>
          <Typography variant="h6" color="primary">
            ${costBreakdown.lambdaCost.toFixed(4)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {costBreakdown.lambdaInvocations.toLocaleString()} invocations/month
          </Typography>
        </Box>

        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            DynamoDB Operations
          </Typography>
          <Typography variant="h6" color="primary">
            ${costBreakdown.dynamoCost.toFixed(4)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {costBreakdown.dynamoOperations.toLocaleString()} operations/month
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" color="primary">
            ${costBreakdown.totalCost.toFixed(4)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total estimated monthly cost
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            icon={<SpeedIcon />}
            label="Real-time"
            color="success"
            size="small"
          />
          <Chip
            icon={<NotificationsIcon />}
            label="Instant alerts"
            color="info"
            size="small"
          />
        </Box>
      </Box>

      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>Cost Breakdown:</strong> IoT Rules Engine ($1.00/million evaluations), 
          Lambda execution ($0.20/million requests), DynamoDB operations ($0.25/million operations).
          Costs are based on estimated usage and may vary.
        </Typography>
      </Alert>

      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          <strong>Why so cheap?</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • AWS IoT Core Rules Engine is highly cost-effective<br/>
          • Only pay when rules are triggered (not continuous polling)<br/>
          • DynamoDB on-demand pricing scales with usage<br/>
          • Lambda serverless execution minimizes costs
        </Typography>
      </Box>
    </Paper>
  );
}
