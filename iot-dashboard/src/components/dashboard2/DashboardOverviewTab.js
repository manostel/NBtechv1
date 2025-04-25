import React from 'react';
import { Box, Grid, Typography } from '@mui/material';
import MetricCard from './MetricCard';
import VariableSelector from './VariableSelector';

const DashboardOverviewTab = ({ 
  metricsData, 
  metricsConfig,
  deviceState,
  selectedVariables,
  availableVariables,
  onVariableChange
}) => {
  if (!metricsData || !metricsConfig) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading metrics...</Typography>
      </Box>
    );
  }

  // Get the latest data point from data_latest array
  const latestData = metricsData.data_latest?.[0] || {};
  const summary = metricsData.summary_latest || {};

  return (
    <Box sx={{ p: 3 }}>
      <VariableSelector
        variables={availableVariables}
        selectedVariables={selectedVariables}
        onVariableChange={onVariableChange}
      />
      
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {selectedVariables.map((key) => {
          const config = metricsConfig[key];
          if (!config) return null;

          // Get value directly from latestData
          const value = latestData[key];
          
          return (
            <Grid item xs={12} sm={6} md={3} key={key}>
              <MetricCard
                title={config.label}
                value={value !== undefined ? value : 'N/A'}
                unit={config.unit}
                color={config.color}
              />
            </Grid>
          );
        })}
      </Grid>

      {/* Device Status Section */}
      {deviceState && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Device Status
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="LED 1"
                value={deviceState.led1_state === 1 ? "ON" : "OFF"}
                isText={true}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="LED 2"
                value={deviceState.led2_state === 1 ? "ON" : "OFF"}
                isText={true}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Motor Speed"
                value={deviceState.motor_speed}
                unit="%"
              />
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default DashboardOverviewTab; 