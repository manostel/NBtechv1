import React from 'react';
import { Box, Typography } from '@mui/material';
import DashboardCommands from './DashboardCommands';

const DashboardCommandsTab = ({ 
  device, 
  deviceState, 
  onCommandSend, 
  setSnackbar,
  commandHistory,
  setCommandHistory,
  metricsConfig,
  metricsData,
  fetchDeviceState
}) => {
  return (
    <Box sx={{ py: 3, px: { xs: 0, sm: 3 } }}>
      <Typography variant="h6" gutterBottom>
        Device Commands
      </Typography>
      <DashboardCommands 
        device={device}
        deviceState={deviceState}
        onCommandSend={onCommandSend}
        setSnackbar={setSnackbar}
        commandHistory={commandHistory}
        setCommandHistory={setCommandHistory}
        metricsConfig={metricsConfig}
        metricsData={metricsData}
        fetchDeviceState={fetchDeviceState}
      />
    </Box>
  );
};

export default DashboardCommandsTab; 