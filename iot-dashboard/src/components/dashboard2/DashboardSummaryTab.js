import React from 'react';
import { Box, Grid, Typography, useTheme } from '@mui/material';
import MetricCard from './MetricCard';

const DashboardSummaryTab = ({ metricsData, metricsConfig, timeRange }) => {
  const theme = useTheme();

  const renderSummaryCards = () => {
    if (!metricsData || !metricsConfig) return null;

    return Object.entries(metricsConfig).map(([key, config]) => {
      if (key === 'client_id' || key === 'ClientID') return null;
      
      const data = metricsData[key];
      if (!data || !Array.isArray(data) || data.length === 0) return null;

      const value = data[data.length - 1];
      if (value === undefined || value === null) return null;

      const displayValue = typeof value === 'number' ? value.toFixed(1) : value;

      return (
        <Grid item xs={12} sm={6} key={key}>
          <MetricCard
            title={config.label}
            value={displayValue}
            unit={config.unit}
            color={config.color}
            alertThresholds={config.alertThresholds}
          />
        </Grid>
      );
    }).filter(Boolean); // Remove null entries
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Device Metrics
      </Typography>
      <Grid container spacing={3}>
        {renderSummaryCards()}
      </Grid>
    </Box>
  );
};

export default DashboardSummaryTab; 