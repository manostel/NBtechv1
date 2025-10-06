import React from 'react';
import { Box, Grid, Typography, Paper, useTheme } from '@mui/material';
import { 
  Lightbulb as LightbulbIcon,
  Speed as SpeedIcon,
  Power as PowerIcon,
  Settings as SettingsIcon,
  BatteryChargingFull as ChargingIcon,
  Input as InputIcon,
  Output as OutputIcon
} from '@mui/icons-material';
import PropTypes from 'prop-types';

const StateCard = ({ title, value, icon, color, unit, isBoolean }) => {
  const theme = useTheme();

  const getBooleanColor = (value) => {
    return value ? theme.palette.success.main : theme.palette.grey[400];
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
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, minHeight: 24 }}>
        {React.cloneElement(icon, {
          sx: {
            color: isBoolean ? getBooleanColor(value) : (color || theme.palette.primary.main),
            fontSize: 24,
            mr: 1
          }
        })}
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
          {displayValue !== undefined ? (typeof displayValue === 'number' ? displayValue.toFixed(2) : displayValue) : 'N/A'}
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


  if (!deviceState) {
    return null;
  }

  return (
    <Box sx={{ mt: 2, width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, minWidth: 0 }}>
        <SettingsIcon sx={{ mr: 0.5, fontSize: '1.25rem', color: 'primary.main' }} />
        <Typography variant="h6" sx={{ fontSize: '1rem' }}>
          Current Sets
        </Typography>
      </Box>
      <Grid container spacing={1} sx={{ flexGrow: 1, minWidth: 0, flexWrap: 'wrap' }}>
        {/* Output Controls */}
        <Grid item xs={6} sm={6} md={4} lg={3}>
            <StateCard
            title="Output 1 Control Status"
              value={deviceState.out1_state === 1}
              icon={<LightbulbIcon />}
            color={theme.palette.success.main}
              isBoolean={true}
            />
        </Grid>
        <Grid item xs={6} sm={6} md={4} lg={3}>
            <StateCard
            title="Output 2 Control Status"
              value={deviceState.out2_state === 1}
              icon={<LightbulbIcon />}
            color={theme.palette.warning.main}
              isBoolean={true}
            />
        </Grid>
        
        {/* Motor and Power */}
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

        {/* Device Status */}
        <Grid item xs={6} sm={6} md={4} lg={3}>
            <StateCard
            title="Charging Status"
              value={deviceState.charging === 1}
              icon={<ChargingIcon />}
            color={theme.palette.success.main}
              isBoolean={true}
            />
        </Grid>

        {/* Input States */}
        <Grid item xs={6} sm={6} md={4} lg={3}>
            <StateCard
            title="Input 1 Status"
              value={deviceState.in1_state === 1}
              icon={<InputIcon />}
            color={theme.palette.primary.main}
              isBoolean={true}
            />
        </Grid>
        <Grid item xs={6} sm={6} md={4} lg={3}>
            <StateCard
            title="Input 2 Status"
              value={deviceState.in2_state === 1}
              icon={<InputIcon />}
            color={theme.palette.secondary.main}
              isBoolean={true}
            />
        </Grid>

        {/* Output States */}
        <Grid item xs={6} sm={6} md={4} lg={3}>
            <StateCard
            title="Output 1 Status"
              value={deviceState.out1_state === 1}
              icon={<OutputIcon />}
            color={theme.palette.success.main}
              isBoolean={true}
            />
        </Grid>
        <Grid item xs={6} sm={6} md={4} lg={3}>
            <StateCard
            title="Output 2 Status"
              value={deviceState.out2_state === 1}
              icon={<OutputIcon />}
            color={theme.palette.warning.main}
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