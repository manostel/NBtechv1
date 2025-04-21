import React from 'react';
import { Box, Paper, Typography, Grid } from '@mui/material';
import MetricCard from './MetricCard';

const DashboardOverviewTab = ({ metricsData, metricsConfig, deviceState }) => {
  // Early return if required props are not available
  if (!metricsData || !metricsConfig) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          Loading metrics data...
        </Typography>
      </Box>
    );
  }

  // Get the latest data point from the data array
  const latestData = metricsData.data?.[metricsData.data.length - 1] || {};
  const summary = metricsData.summary || {};

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Key Metrics */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Key Metrics
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(metricsConfig).map(([key, config]) => {
                // First try to get the value from the summary
                let value = summary[`latest_${key}`];
                
                // If not in summary, try to get from the latest data point
                if (value === undefined) {
                  value = latestData[key];
                }

                // If still undefined, try alternative keys
                if (value === undefined) {
                  if (key === 'signal_quality') {
                    value = summary.latest_signal || latestData.signal;
                  } else if (key === 'battery') {
                    value = summary.latest_battery_level || latestData.battery_level;
                  } else if (key === 'temperature') {
                    value = summary.latest_thermistor_temp || latestData.thermistor_temp;
                  }
                }

                return (
                  <Grid item xs={12} sm={6} md={3} key={key}>
                    <MetricCard
                      title={config.label}
                      value={value !== undefined ? value : 'N/A'}
                      unit={config.unit}
                    />
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        </Grid>

        {/* Device Status */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Device Status
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="LED 1"
                  value={deviceState?.led1_state === 1 ? 'ON' : 'OFF'}
                  isText={true}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="LED 2"
                  value={deviceState?.led2_state === 1 ? 'ON' : 'OFF'}
                  isText={true}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Motor Speed"
                  value={deviceState?.motor_speed ?? 0}
                  unit="%"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Last Update"
                  value={latestData?.timestamp ? new Date(latestData.timestamp).toLocaleString() : 'N/A'}
                  isText={true}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardOverviewTab; 