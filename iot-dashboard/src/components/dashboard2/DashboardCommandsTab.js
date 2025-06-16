import React from 'react';
import { Box, Typography } from '@mui/material';
import DashboardCommands from './DashboardCommands';
import { Settings as SettingsIcon } from '@mui/icons-material';

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
    <Box sx={{ py: 0, px: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, height: '32px', mb: 1 }}>
        <SettingsIcon sx={{ color: 'success.main', fontSize: '1.25rem' }} />
        <span style={{ fontWeight: 400, fontSize: '1rem' }}>Commands</span>
      </Box>
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