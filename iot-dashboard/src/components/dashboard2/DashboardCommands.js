import React from 'react';
import { Paper, Typography, Grid, Switch, Slider, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export default function DashboardCommands({ deviceState, setDeviceState }) {
  const theme = useTheme();

  const handleSwitchChange = (event) => {
    const { name, checked } = event.target;
    setDeviceState(prev => ({
      ...prev,
      [name]: checked ? 1 : 0
    }));
  };

  const handleSliderChange = (event, newValue) => {
    setDeviceState(prev => ({
      ...prev,
      motor_speed: newValue
    }));
  };

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Device Controls
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography>LED 1</Typography>
            <Switch
              checked={deviceState.led1_state === 1}
              onChange={handleSwitchChange}
              name="led1_state"
              color="primary"
            />
          </Box>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography>LED 2</Typography>
            <Switch
              checked={deviceState.led2_state === 1}
              onChange={handleSwitchChange}
              name="led2_state"
              color="primary"
            />
          </Box>
        </Grid>
        <Grid item xs={12}>
          <Typography gutterBottom>Motor Speed</Typography>
          <Slider
            value={deviceState.motor_speed}
            onChange={handleSliderChange}
            aria-labelledby="motor-speed-slider"
            valueLabelDisplay="auto"
            min={0}
            max={100}
          />
        </Grid>
      </Grid>
    </Paper>
  );
} 