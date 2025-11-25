import React from 'react';
import { Box, Grid, Typography } from '@mui/material';
import MetricCard from './MetricCard';
import type { DashboardData, MetricsConfig } from '../../../types';

interface DashboardSummaryTabProps {
  metricsData: DashboardData | null;
  metricsConfig: MetricsConfig | null;
  timeRange: string;
}

const DashboardSummaryTab: React.FC<DashboardSummaryTabProps> = ({ metricsData, metricsConfig, timeRange }) => {
  const renderSummaryCards = () => {
    if (!metricsData || !metricsConfig) return null;

    return Object.entries(metricsConfig).map(([key, config]) => {
      if (key === 'client_id' || key === 'ClientID') return null;
      
      // Check if metricsData has properties matching the key
      // This assumes metricsData is an object where keys might be arrays of values
      // If metricsData structure is different (e.g. only has 'data' array), this logic needs adjustment
      // Based on JS code: const data = metricsData[key];
      // But defined type DashboardData has { data: [], summary: {} }
      // The JS code suggests metricsData might be different or I am misinterpreting the type
      // Let's assume metricsData might have direct array properties for now or access via data array
      
      // Adapting to the JS logic: const data = metricsData[key];
      // We'll cast to any for flexible access if the type definition is strict
      const data = (metricsData as any)[key];
      
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

