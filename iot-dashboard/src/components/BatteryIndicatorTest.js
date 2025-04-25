import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import BatteryIndicator from './BatteryIndicator';

const states = ['charging', 'discharging', 'idle'];

export default function BatteryIndicatorTest() {
  const [currentState, setCurrentState] = useState('idle');
  const [batteryLevel, setBatteryLevel] = useState(50);

  useEffect(() => {
    const interval = setInterval(() => {
      // Cycle through states
      setCurrentState(prevState => {
        const currentIndex = states.indexOf(prevState);
        const nextIndex = (currentIndex + 1) % states.length;
        return states[nextIndex];
      });

      // Simulate battery level changes
      setBatteryLevel(prevLevel => {
        switch (currentState) {
          case 'charging':
            return Math.min(100, prevLevel + 5);
          case 'discharging':
            return Math.max(0, prevLevel - 5);
          default:
            return prevLevel;
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [currentState]);

  return (
    <Paper sx={{ p: 3, maxWidth: 300, mx: 'auto', mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Battery Indicator Test
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <BatteryIndicator 
          value={batteryLevel} 
          batteryState={currentState}
        />
        <Typography variant="body2" color="text.secondary">
          Current State: {currentState}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Battery Level: {batteryLevel}%
        </Typography>
      </Box>
    </Paper>
  );
} 