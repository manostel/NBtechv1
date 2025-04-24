import React from 'react';
import { Box, Grid, Typography, Paper, useTheme } from '@mui/material';
import { 
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import SharedControls from './SharedControls';

const DashboardStatisticsTab = ({ 
  metricsData, 
  metricsConfig,
  timeRange,
  selectedVariables,
  availableVariables,
  onVariableChange,
  onTimeRangeChange,
  onApply
}) => {
  const theme = useTheme();

  const calculateStatistics = (data, key) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return null;
    }

    const values = data.map(item => item[key]).filter(val => val !== undefined && val !== null);
    if (values.length === 0) return null;

    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Calculate standard deviation
    const squareDiffs = values.map(val => Math.pow(val - average, 2));
    const avgSquareDiff = squareDiffs.reduce((acc, val) => acc + val, 0) / values.length;
    const standardDeviation = Math.sqrt(avgSquareDiff);

    return {
      average,
      min,
      max,
      standardDeviation,
      count: values.length
    };
  };

  const StatCard = ({ title, value, unit, icon, color }) => (
    <Paper sx={{ p: 2, height: '100%', bgcolor: theme.palette.background.paper }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        {icon}
        <Typography variant="subtitle1" color="primary">
          {title}
        </Typography>
      </Box>
      <Typography variant="h4" sx={{ color }}>
        {value !== undefined ? value.toFixed(2) : 'N/A'}{unit}
      </Typography>
    </Paper>
  );

  return (
    <Box sx={{ p: 3 }}>
      <SharedControls
        selectedVariables={selectedVariables}
        availableVariables={availableVariables}
        onVariableChange={onVariableChange}
        timeRange={timeRange}
        onTimeRangeChange={onTimeRangeChange}
        onApply={onApply}
      />
      <Grid container spacing={3}>
        {selectedVariables.map((key) => {
          const config = metricsConfig[key];
          if (!config) return null;

          const stats = calculateStatistics(metricsData.data, key);
          if (!stats) return null;

          return (
            <Grid item xs={12} key={key}>
              <Paper sx={{ p: 3, mb: 3, bgcolor: theme.palette.background.paper }}>
                <Typography variant="h6" gutterBottom>
                  {config.label}
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Average"
                      value={stats.average}
                      unit={config.unit}
                      icon={<TimelineIcon color="primary" />}
                      color={theme.palette.primary.main}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Minimum"
                      value={stats.min}
                      unit={config.unit}
                      icon={<TrendingDownIcon color="error" />}
                      color={theme.palette.error.main}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Maximum"
                      value={stats.max}
                      unit={config.unit}
                      icon={<TrendingUpIcon color="success" />}
                      color={theme.palette.success.main}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Standard Deviation"
                      value={stats.standardDeviation}
                      unit={config.unit}
                      icon={<SpeedIcon color="warning" />}
                      color={theme.palette.warning.main}
                    />
                  </Grid>
                </Grid>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                  Based on {stats.count} data points
                </Typography>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default DashboardStatisticsTab; 