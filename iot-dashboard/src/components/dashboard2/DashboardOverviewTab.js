import React from 'react';
import { Box, Grid, Typography, Paper, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Error as ErrorIcon, Warning as WarningIcon, Info as InfoIcon, ShowChart as ShowChartIcon } from '@mui/icons-material';
import OverviewTiles from './OverviewTiles';
import VariableSelector from './VariableSelector';
import DeviceStateDisplay from './DeviceStateDisplay';
import PropTypes from 'prop-types';
import MetricCard from './MetricCard';

const TriggeredAlarms = ({ triggeredAlarms, metricsConfig }) => {
  if (!triggeredAlarms || triggeredAlarms.length === 0) {
    return null;
  }

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'info':
        return <InfoIcon color="info" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const getSeverityText = (severity) => {
    if (!severity) return 'Info';
    return severity.charAt(0).toUpperCase() + severity.slice(1);
  };

  return (
    <Paper sx={{ mt: 3, p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Active Alarms
      </Typography>
      <List>
        {triggeredAlarms.map(alarm => (
          <ListItem key={alarm.alarm_id}>
            <ListItemIcon>
              {getSeverityIcon(alarm.severity)}
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography>
                  {metricsConfig[alarm.variable_name]?.label || alarm.variable_name} {alarm.condition} {alarm.threshold}{metricsConfig[alarm.variable_name]?.unit || ''}
                </Typography>
              }
              secondary={
                <Box>
                  <Typography component="span" variant="body2" color="text.primary">
                    Current value: {alarm.current_value}{metricsConfig[alarm.variable_name]?.unit || ''}
                  </Typography>
                  <Typography 
                    component="span" 
                    variant="body2" 
                    sx={{ 
                      color: alarm.severity === 'error' ? 'error.main' : 
                            alarm.severity === 'warning' ? 'warning.main' : 'info.main',
                      ml: 1,
                      fontWeight: 'medium'
                    }}
                  >
                    {getSeverityText(alarm.severity)}
                  </Typography>
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

TriggeredAlarms.propTypes = {
  triggeredAlarms: PropTypes.array,
  metricsConfig: PropTypes.object
};

const DashboardOverviewTab = ({ 
  metricsData, 
  metricsConfig,
  selectedVariables,
  availableVariables,
  deviceState,
  isLoading,
  onVariableChange,
  triggeredAlarms
}) => {
  if (!metricsData || !metricsConfig) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading metrics...</Typography>
      </Box>
    );
  }

  const renderOverviewCards = () => {
    if (!metricsData || !metricsConfig) return null;

    // Get the latest data point
    const latestData = metricsData.data_latest?.[0] || metricsData.data?.[0] || {};
    
    return Object.entries(metricsConfig).map(([key, config]) => {
      if (key === 'client_id' || key === 'ClientID') return null;
      
      const value = latestData[key];
      if (value === undefined || value === null) return null;

      const displayValue = typeof value === 'number' ? value.toFixed(1) : value;
      
      return (
        <Grid item xs={6} sm={6} md={4} lg={3} key={key}>
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
    <Box sx={{ py: 0.5, px: { xs: 0, sm: 0.5 }, width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Metrics Title and Variable Selector */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ShowChartIcon sx={{ color: 'success.main', fontSize: '1.25rem' }} />
          <Typography variant="h6" sx={{ fontSize: '1rem' }}>Metrics</Typography>
        </Box>
      <VariableSelector
        variables={availableVariables}
        selectedVariables={selectedVariables}
        onVariableChange={onVariableChange}
          showTitle={false}
      />
      </Box>

      {/* Overview Tiles */}
      <Box sx={{ mt: 1.5, flexGrow: 1, minWidth: 0 }}>
        <OverviewTiles
          metricsData={metricsData}
          metricsConfig={metricsConfig}
          selectedVariables={selectedVariables}
          isLoading={isLoading}
          triggeredAlarms={triggeredAlarms}
              />
      </Box>

      {/* Device State Display */}
      <DeviceStateDisplay
        deviceState={deviceState}
        isLoading={isLoading}
      />
    </Box>
  );
};

DashboardOverviewTab.propTypes = {
  metricsData: PropTypes.object,
  metricsConfig: PropTypes.object,
  selectedVariables: PropTypes.arrayOf(PropTypes.string),
  availableVariables: PropTypes.arrayOf(PropTypes.string),
  deviceState: PropTypes.object,
  isLoading: PropTypes.bool,
  onVariableChange: PropTypes.func,
  triggeredAlarms: PropTypes.array
};

export default DashboardOverviewTab; 