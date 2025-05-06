import React from 'react';
import { Box, Grid, Typography, Paper, LinearProgress, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { 
  Lightbulb as LightbulbIcon,
  Speed as SpeedIcon,
  Power as PowerIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import PropTypes from 'prop-types';

const CircularGauge = ({ value, size = 100, strokeWidth = 10 }) => {
  const theme = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;
  const offset = circumference - progress;

  return (
    <Box sx={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={theme.palette.grey[200]}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={theme.palette.primary.main}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center'
        }}
      >
        <Typography variant="h5" component="div">
          {value}%
        </Typography>
      </Box>
    </Box>
  );
};

const StateCard = ({ title, value, icon, color, unit, isBoolean, isLoading }) => {
  const theme = useTheme();

  const getBooleanColor = (value) => {
    return value ? theme.palette.success.main : theme.palette.error.main;
  };

  const getBooleanText = (value) => {
    return value ? "Active" : "Inactive";
  };

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
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[2]
        }
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          bgcolor: isBoolean ? getBooleanColor(value) : color,
          opacity: 0.2
        }}
      />
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {React.cloneElement(icon, {
          sx: {
            color: isBoolean ? getBooleanColor(value) : color,
            fontSize: 24
          }
        })}
        <Typography variant="subtitle2" color="textSecondary" sx={{ ml: 1 }}>
          {title}
        </Typography>
      </Box>

      {isLoading ? (
        <LinearProgress />
      ) : (
        <Box sx={{ mt: 1 }}>
          {isBoolean ? (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography 
                variant="h4" 
                sx={{ 
                  color: getBooleanColor(value),
                  fontWeight: 'medium'
                }}
              >
                {getBooleanText(value)}
              </Typography>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: getBooleanColor(value),
                  ml: 1
                }}
              />
            </Box>
          ) : (
            <>
              <Typography variant="h4" component="div">
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
              <LinearProgress 
                variant="determinate" 
                value={value} 
                sx={{ 
                  mt: 1,
                  height: 4,
                  borderRadius: 2,
                  bgcolor: theme.palette.grey[200],
                  '& .MuiLinearProgress-bar': {
                    bgcolor: color
                  }
                }}
              />
            </>
          )}
        </Box>
      )}
    </Paper>
  );
};

const DeviceStateDisplay = ({ deviceState, isLoading }) => {
  const theme = useTheme();

  if (!deviceState) return null;

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <SettingsIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
        <Typography variant="h6">
          Current Sets
        </Typography>
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <StateCard
            title="LED 1 Control Status"
            value={deviceState.led1_state === 1}
            icon={<LightbulbIcon />}
            color={theme.palette.primary.main}
            isBoolean={true}
            isLoading={isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StateCard
            title="LED 2 Control Status"
            value={deviceState.led2_state === 1}
            icon={<LightbulbIcon />}
            color={theme.palette.primary.main}
            isBoolean={true}
            isLoading={isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StateCard
            title="Motor Speed Control"
            value={deviceState.motor_speed}
            icon={<SpeedIcon />}
            color={theme.palette.primary.main}
            unit="%"
            isLoading={isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StateCard
            title="Power Saving Mode Status"
            value={deviceState.power_saving === 1}
            icon={<PowerIcon />}
            color={theme.palette.primary.main}
            isBoolean={true}
            isLoading={isLoading}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

StateCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]),
  icon: PropTypes.element.isRequired,
  color: PropTypes.string,
  unit: PropTypes.string,
  isBoolean: PropTypes.bool,
  isLoading: PropTypes.bool
};

DeviceStateDisplay.propTypes = {
  deviceState: PropTypes.object,
  isLoading: PropTypes.bool
};

export default DeviceStateDisplay; 