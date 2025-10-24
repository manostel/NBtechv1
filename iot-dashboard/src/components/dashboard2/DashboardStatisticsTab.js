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
    <Paper 
      elevation={0}
      sx={{ 
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid #e3f2fd',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          transform: 'translateY(-2px)'
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, minHeight: 24 }}>
        {icon && React.cloneElement(icon, { sx: { fontSize: 20, color: color || theme.palette.primary.main, mr: 1 } })}
        <Typography variant="subtitle2" color="textSecondary" sx={{ fontWeight: 400, fontSize: '0.95rem', textAlign: 'left' }}>
          {title}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-start', gap: 0.5, ml: 0 }}>
        <Typography
          variant="h4"
          component="div"
          sx={{ fontSize: '1.2rem', fontWeight: 400, lineHeight: 1 }}
        >
          {value !== undefined ? value.toFixed(2) : 'N/A'}
        </Typography>
        {unit && (
          <Typography 
            component="span" 
            variant="body2" 
            color="textSecondary"
            sx={{ fontSize: '0.9rem', ml: 0 }}
          >
            {unit}
          </Typography>
        )}
      </Box>
    </Paper>
  );

  let dataPointsCount = null;
  const statsList = selectedVariables.map((key) => {
    const config = metricsConfig[key];
    if (!config) return null;

    const stats = calculateStatistics(metricsData.data, key);
    if (!stats) return null;
    if (dataPointsCount === null) dataPointsCount = stats.count;

    return (
      <Grid item xs={12} key={key}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            {config.label}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={6} md={3}>
              <StatCard
                title="Average"
                value={stats.average}
                unit={config.unit}
                icon={<TimelineIcon color="primary" />}
                color={theme.palette.primary.main}
              />
            </Grid>
            <Grid item xs={6} sm={6} md={3}>
              <StatCard
                title="Minimum"
                value={stats.min}
                unit={config.unit}
                icon={<TrendingDownIcon color="error" />}
                color={theme.palette.error.main}
              />
            </Grid>
            <Grid item xs={6} sm={6} md={3}>
              <StatCard
                title="Maximum"
                value={stats.max}
                unit={config.unit}
                icon={<TrendingUpIcon color="success" />}
                color={theme.palette.success.main}
              />
            </Grid>
            <Grid item xs={6} sm={6} md={3}>
              <StatCard
                title="Standard Deviation"
                value={stats.standardDeviation}
                unit={config.unit}
                icon={<SpeedIcon color="warning" />}
                color={theme.palette.warning.main}
              />
            </Grid>
          </Grid>
        </Box>
      </Grid>
    );
  }).filter(Boolean);

  return (
    <Box sx={{ py: 0, px: 0.5 }}>
      <SharedControls
        selectedVariables={selectedVariables}
        availableVariables={availableVariables}
        onVariableChange={onVariableChange}
        timeRange={timeRange}
        onTimeRangeChange={onTimeRangeChange}
        onApply={onApply}
        title={<span style={{ fontWeight: 400, fontSize: '1rem' }}>Statistics</span>}
      />
      <Grid container spacing={2}>
        {statsList}
      </Grid>
      {dataPointsCount !== null && (
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2, textAlign: 'center' }}>
          Based on {dataPointsCount} data points
        </Typography>
      )}
    </Box>
  );
};

export default DashboardStatisticsTab; 