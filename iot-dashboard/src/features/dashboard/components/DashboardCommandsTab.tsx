import React from 'react';
import { Box, Typography } from '@mui/material';
import DashboardCommands from './DashboardCommands';
import { Settings as SettingsIcon } from '@mui/icons-material';
import { Device, MetricsConfig } from '../../../types';

interface DashboardCommandsTabProps {
  device: Device;
  deviceState: any;
  onCommandSend: (command: string, params?: any) => Promise<any>;
  setSnackbar: (snackbar: any) => void;
  commandHistory: any[];
  setCommandHistory: (history: any[]) => void;
  metricsConfig: MetricsConfig;
  metricsData: any;
  fetchDeviceState: () => Promise<any>;
}

const DashboardCommandsTab: React.FC<DashboardCommandsTabProps> = ({ 
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
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1, 
        mb: 2,
        px: 2,
        py: 1.5,
        background: 'linear-gradient(135deg, rgba(26, 31, 60, 0.8) 0%, rgba(31, 37, 71, 0.9) 50%, rgba(26, 31, 60, 0.8) 100%)',
        borderRadius: 3,
        border: 'none',
        position: 'relative',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, #4caf50, #2196f3)',
          borderRadius: '3px 3px 0 0',
          opacity: 0.4
        }
      }}>
        <Box sx={{ 
          p: 0.5, 
          borderRadius: 2,
          background: 'linear-gradient(135deg, #4caf50, #2196f3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <SettingsIcon sx={{ color: '#ffffff', fontSize: '1.1rem' }} />
        </Box>
        <Typography variant="h6" sx={{ 
          fontSize: { xs: '0.95rem', sm: '1rem' }, 
          fontFamily: '"Exo 2", "Roboto", "Helvetica", "Arial", sans-serif',
          fontWeight: 600,
          letterSpacing: '0.2px',
          textTransform: 'none',
          background: 'linear-gradient(45deg, #4caf50, #2196f3)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Commands
        </Typography>
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

