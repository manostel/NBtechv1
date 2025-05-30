import React from 'react';
import { Grid, Paper, Typography, Box, CircularProgress, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PropTypes from 'prop-types';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';

const getSeverityIcon = (severity) => {
  switch (severity?.toLowerCase()) {
    case 'error':
      return <ErrorIcon color="error" sx={{ fontSize: '1rem' }} />;
    case 'warning':
      return <WarningIcon color="warning" sx={{ fontSize: '1rem' }} />;
    case 'info':
      return <InfoIcon color="info" sx={{ fontSize: '1rem' }} />;
    default:
      return <InfoIcon color="info" sx={{ fontSize: '1rem' }} />;
  }
};

const OverviewTile = ({ title, value, unit, icon, color, isLoading, triggeredAlarmsList }) => {
  const theme = useTheme();
  
  const alarmActive = Array.isArray(triggeredAlarmsList) && triggeredAlarmsList.length > 0;

  const getHighestSeverity = (alarms) => {
    if (!alarms || alarms.length === 0) return 'info';
    if (alarms.some(alarm => alarm.severity?.toLowerCase() === 'error')) return 'error';
    if (alarms.some(alarm => alarm.severity?.toLowerCase() === 'warning')) return 'warning';
    return 'info';
  };

  const getTooltipTitle = (alarms) => {
    if (!alarms || alarms.length === 0) return 'No alarms triggered';
    if (alarms.length === 1) return alarms[0].description || 'Alarm triggered';
    return (
      <>
        <Typography color="inherit">Multiple Alarms Triggered:</Typography>
        {alarms.map((alarm, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
            {getSeverityIcon(alarm.severity)}
            <Typography variant="caption" display="block" color="inherit" sx={{ ml: 0.5 }}>
              {alarm.description || `Alarm ${index + 1} triggered`}
            </Typography>
          </Box>
        ))}
      </>
    );
  };

  const overallAlarmSeverity = getHighestSeverity(triggeredAlarmsList);
  const tooltipTitle = getTooltipTitle(triggeredAlarmsList);

  console.log(`OverviewTile ${title} alarmActive:`, alarmActive, 'severity:', overallAlarmSeverity);
  
  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: theme.palette.divider,
        borderRadius: 2,
        bgcolor: theme.palette.background.paper,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[2]
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        {icon}
        <Typography variant="subtitle2" color="textSecondary" sx={{ ml: 1 }}>
          {title}
        </Typography>
        {alarmActive && (
          <Tooltip 
            title={tooltipTitle}
            arrow
            placement="top"
          >
            <Box sx={{ ml: 1, cursor: 'help' }}>
              {getSeverityIcon(overallAlarmSeverity)}
            </Box>
          </Tooltip>
        )}
      </Box>
      {isLoading ? (
        <CircularProgress size={24} />
      ) : (
        <Typography variant="h4" component="div" sx={{ mt: 1 }}>
          {value}
          {unit && (
            <Typography 
              component="span" 
              variant="body2" 
              color="textSecondary"
              sx={{ ml: 0.5 }}
            >
              {unit}
            </Typography>
          )}
        </Typography>
      )}
    </Paper>
  );
};

const OverviewTiles = ({ 
  metricsData, 
  metricsConfig, 
  selectedVariables, 
  isLoading,
  triggeredAlarms
}) => {
  const theme = useTheme();

  console.log('OverviewTiles received triggeredAlarms:', triggeredAlarms);

  if (!metricsData || !metricsConfig || !selectedVariables) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading metrics...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={2}>
        {selectedVariables.map((variable) => {
          const config = metricsConfig[variable];
          if (!config) return null;

          // Get the latest data point
          const latestData = metricsData.data_latest?.[0] || metricsData.data?.[0] || {};
          console.log(`Latest data for ${variable}:`, latestData[variable]);

          const value = latestData[variable];
          if (value === undefined || value === null) {
            console.log(`No value found for ${variable}`);
            return null;
          }

          // Find ALL triggered alarms for this variable
          const triggeredAlarmsList = Array.isArray(triggeredAlarms) 
            ? triggeredAlarms.filter(alarm => alarm.variable_name === variable)
            : [];

          console.log(`Tile ${variable} triggered alarms:`, triggeredAlarmsList.length);

          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={variable}>
              <OverviewTile
                title={config.label}
                value={typeof value === 'number' ? value.toFixed(1) : '0.0'}
                unit={config.unit}
                icon={config.icon}
                color={config.color}
                isLoading={isLoading}
                triggeredAlarmsList={triggeredAlarmsList}
              />
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

OverviewTile.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  unit: PropTypes.string,
  icon: PropTypes.node,
  color: PropTypes.string,
  isLoading: PropTypes.bool,
  triggeredAlarmsList: PropTypes.arrayOf(PropTypes.shape({
    alarm_id: PropTypes.string,
    variable_name: PropTypes.string,
    condition: PropTypes.string,
    threshold: PropTypes.number,
    description: PropTypes.string,
    enabled: PropTypes.bool,
    severity: PropTypes.string,
    current_value: PropTypes.number,
  })),
};

OverviewTiles.propTypes = {
  metricsData: PropTypes.object,
  metricsConfig: PropTypes.object,
  selectedVariables: PropTypes.arrayOf(PropTypes.string),
  isLoading: PropTypes.bool,
  triggeredAlarms: PropTypes.array
};

export default OverviewTiles; 