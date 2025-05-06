import React from 'react';
import { Grid, Paper, Typography, Box, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PropTypes from 'prop-types';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';

// Helper to normalize variable names for comparison
const normalize = str => {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/[_ ]/g, '')
    .replace('signalquality', 'signal_quality')
    .replace('thermistortemp', 'thermistor_temp');
};

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

const OverviewTile = ({ title, value, unit, icon, color, isLoading, alarmActive, alarmSeverity }) => {
  const theme = useTheme();
  
  console.log(`OverviewTile ${title} alarmActive:`, alarmActive, 'severity:', alarmSeverity);
  
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
          <Box sx={{ ml: 1 }}>
            {getSeverityIcon(alarmSeverity)}
          </Box>
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

          // Check if an alarm is triggered for this variable (normalize names)
          const triggeredAlarm = Array.isArray(triggeredAlarms) && triggeredAlarms.find(alarm => {
            const normalizedAlarmVar = normalize(alarm.variable_name);
            const normalizedTileVar = normalize(variable);
            console.log('Variable name comparison:', {
              alarmOriginal: alarm.variable_name,
              alarmNormalized: normalizedAlarmVar,
              tileOriginal: variable,
              tileNormalized: normalizedTileVar,
              matches: normalizedAlarmVar === normalizedTileVar,
              triggeredAlarms: triggeredAlarms.map(a => ({
                original: a.variable_name,
                normalized: normalize(a.variable_name)
              }))
            });
            return normalizedAlarmVar === normalizedTileVar;
          });

          const alarmActive = !!triggeredAlarm;
          const alarmSeverity = triggeredAlarm?.severity;

          console.log(`Tile ${variable} alarm status:`, alarmActive, 'severity:', alarmSeverity);

          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={variable}>
              <OverviewTile
                title={config.label}
                value={typeof value === 'number' ? value.toFixed(1) : '0.0'}
                unit={config.unit}
                icon={config.icon}
                color={config.color}
                isLoading={isLoading}
                alarmActive={alarmActive}
                alarmSeverity={alarmSeverity}
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
  alarmActive: PropTypes.bool,
  alarmSeverity: PropTypes.string
};

OverviewTiles.propTypes = {
  metricsData: PropTypes.object,
  metricsConfig: PropTypes.object,
  selectedVariables: PropTypes.arrayOf(PropTypes.string),
  isLoading: PropTypes.bool,
  triggeredAlarms: PropTypes.array
};

export default OverviewTiles; 