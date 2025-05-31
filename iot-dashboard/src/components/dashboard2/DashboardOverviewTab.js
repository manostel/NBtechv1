import React from 'react';
import { Box, Grid, Typography, Paper, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Error as ErrorIcon, Warning as WarningIcon, Info as InfoIcon, ShowChart as ShowChartIcon } from '@mui/icons-material';
import OverviewTiles from './OverviewTiles';
import VariableSelector from './VariableSelector';
import DeviceStateDisplay from './DeviceStateDisplay';
import PropTypes from 'prop-types';

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

  return (
    <Box sx={{ p: 2 }}>
      {/* Metrics Title and Variable Selector */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShowChartIcon sx={{ color: 'success.main' }} />
          <Typography variant="h6">Metrics</Typography>
        </Box>
        <VariableSelector
          variables={availableVariables}
          selectedVariables={selectedVariables}
          onVariableChange={onVariableChange}
          showTitle={false}
        />
      </Box>

      {/* Overview Tiles */}
      <Box sx={{ mt: 3 }}>
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