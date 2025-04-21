import React from 'react';
import { Box, Typography } from '@mui/material';
import DashboardCommands from './DashboardCommands';

const DashboardCommandsTab = ({ device, deviceState, onCommandSend }) => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Device Commands
      </Typography>
      <DashboardCommands 
        device={device}
        deviceState={deviceState}
        onCommandSend={onCommandSend}
      />
    </Box>
  );
};

export default DashboardCommandsTab; 