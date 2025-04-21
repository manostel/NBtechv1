import React from 'react';
import { Box, Grid, Typography, useTheme } from '@mui/material';
import MetricCard from './MetricCard';

const DashboardSummaryTab = ({ metricsData, metricsConfig, timeRange }) => {
  const theme = useTheme();

  const renderSummaryCards = () => {
    if (!metricsData || !metricsConfig) return null;

    return Object.entries(metricsConfig).map(([key, config]) => {
      const data = metricsData[key];
      if (!data || !Array.isArray(data) || data.length === 0) return null;

      const latestValue = data[data.length - 1]?.value;
      if (latestValue === undefined) return null;

      return (
        <Grid item xs={12} sm={6} md={3} key={key}>
          <MetricCard
            title={config.label}
            value={latestValue}
            unit={config.unit}
            color={config.color}
            alertThresholds={config.alertThresholds}
          />
        </Grid>
      );
    });
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