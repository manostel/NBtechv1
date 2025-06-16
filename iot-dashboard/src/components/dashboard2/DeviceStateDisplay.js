import React from 'react';
import { Box, Grid, Typography, Paper, useTheme } from '@mui/material';
import { 
  Lightbulb as LightbulbIcon,
  Speed as SpeedIcon,
  Power as PowerIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import PropTypes from 'prop-types';

const StateCard = ({ title, value, icon, color, unit, isBoolean }) => {
  const theme = useTheme();

  const getBooleanColor = (value) => {
    return value ? theme.palette.success.main : theme.palette.error.main;
  };

  const displayValue = isBoolean ? (value ? 1 : 0) : value;

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
        {React.cloneElement(icon, {
          sx: {
            color: isBoolean ? getBooleanColor(value) : (color || theme.palette.primary.main),
            fontSize: 24,
          }
        })}
        <Typography variant="subtitle2" color="textSecondary" sx={{ ml: 1 }}>
          {title}
        </Typography>
      </Box>
      <Typography variant="h4" component="div" sx={{ mt: 1 }}>
        {displayValue !== undefined ? (typeof displayValue === 'number' ? displayValue.toFixed(2) : displayValue) : 'N/A'}
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
    </Paper>
  );
};

StateCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]),
  icon: PropTypes.element.isRequired,
  color: PropTypes.string,
  unit: PropTypes.string,
  isBoolean: PropTypes.bool,
};

const DeviceStateDisplay = ({ deviceState, isLoading }) => {
  const theme = useTheme();

  if (!deviceState) return null;

  return (
    <Box sx={{ mt: 2, width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, minWidth: 0 }}>
        <SettingsIcon sx={{ mr: 0.5, fontSize: '1.25rem', color: 'primary.main' }} />
        <Typography variant="h6" sx={{ fontSize: '1rem' }}>
          Current Sets
        </Typography>
      </Box>
      <Grid container spacing={1} sx={{ flexGrow: 1, minWidth: 0, flexWrap: 'wrap' }}>
        <Grid item xs={6} sm={6} md={4} lg={3}>
            <StateCard
            title="LED 1 Control Status"
              value={deviceState.led1_state === 1}
              icon={<LightbulbIcon />}
            color={theme.palette.success.main}
              isBoolean={true}
            />
        </Grid>
        <Grid item xs={6} sm={6} md={4} lg={3}>
            <StateCard
            title="LED 2 Control Status"
              value={deviceState.led2_state === 1}
              icon={<LightbulbIcon />}
            color={theme.palette.warning.main}
              isBoolean={true}
            />
        </Grid>
        <Grid item xs={6} sm={6} md={4} lg={3}>
            <StateCard
              title="Motor Speed Control"
              value={deviceState.motor_speed}
              icon={<SpeedIcon />}
            color={theme.palette.info.main}
              unit="%"
            />
        </Grid>
        <Grid item xs={6} sm={6} md={4} lg={3}>
            <StateCard
            title="Power Saving Mode Status"
              value={deviceState.power_saving === 1}
              icon={<PowerIcon />}
            color={theme.palette.error.main}
              isBoolean={true}
            />
        </Grid>
      </Grid>
    </Box>
  );
};

DeviceStateDisplay.propTypes = {
  deviceState: PropTypes.object,
  isLoading: PropTypes.bool
};

export default DeviceStateDisplay; 