import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Switch, TextField, Button, CircularProgress, Snackbar } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

const COMMAND_API_URL = 'https://61dd7wovqk.execute-api.eu-central-1.amazonaws.com/default/send-command';
const STATUS_API_URL = 'https://1r9r7s5b01.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-data-status';

const DashboardCommands = ({ 
  device, 
  deviceState, 
  onCommandSend,
  fetchDeviceState,
  handleCommandSend,
  setSnackbar
}) => {
  const [led1State, setLed1State] = useState(false);
  const [led2State, setLed2State] = useState(false);
  const [motorSpeed, setMotorSpeed] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState({
    show: false,
    message: '',
    loading: false
  });

  useEffect(() => {
    if (deviceState) {
      console.log('Updating LED states from deviceState:', deviceState);
      setLed1State(deviceState.led1_state === 1);
      setLed2State(deviceState.led2_state === 1);
      setMotorSpeed(deviceState.motor_speed?.toString() || "0");
    }
  }, [deviceState]);

  const verifyCommandSuccess = (command, params, state) => {
    if (!state) return false;

    switch (command) {
      case 'TOGGLE_1_ON':
        return state.led1_state === 1;
      case 'TOGGLE_1_OFF':
        return state.led1_state === 0;
      case 'TOGGLE_2_ON':
        return state.led2_state === 1;
      case 'TOGGLE_2_OFF':
        return state.led2_state === 0;
      case 'SET_SPEED':
        return state.motor_speed === params.speed;
      case 'RESTART':
        return true; // Consider restart always successful if we get a state
      default:
        return false;
    }
  };

  const sendCommand = async (command, params = {}) => {
    try {
      if (!device || !device.client_id) {
        throw new Error('No device or client_id available');
      }

      const payload = {
        client_id: device.client_id,
        command: command
      };

      const response = await fetch(COMMAND_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send command');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending command:', error);
      throw error;
    }
  };

  const handleSwitchChange = async (led, isOn) => {
    try {
      const command = isOn ? `TOGGLE_${led}_ON` : `TOGGLE_${led}_OFF`;
      
      // Send the command
      await handleCommandSend(command);
      
      // Wait for 5 seconds to allow the device to process the command
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Fetch the latest state using the function from Dashboard2.js
      const latestState = await fetchDeviceState();
      
      // Update the UI with the new state
      if (latestState) {
        setLed1State(latestState.led1_state);
        setLed2State(latestState.led2_state);
        setMotorSpeed(latestState.motor_speed);
      }
    } catch (error) {
      console.error('Error in handleSwitchChange:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to update switch state',
        severity: 'error'
      });
    }
  };

  const handleSpeedSubmit = async (e) => {
    e.preventDefault();
    if (isVerifying) return;

    try {
      setIsVerifying(true);
      setError(null);
      setCommandFeedback({
        show: true,
        message: 'Sending motor speed command...',
        loading: true
      });

      const speed = parseInt(motorSpeed);
      if (isNaN(speed) || speed < 0 || speed > 100) {
        throw new Error('Speed must be between 0 and 100');
      }

      // Send the command
      await handleCommandSend('SET_SPEED', { speed });
      
      setCommandFeedback({
        show: true,
        message: 'Waiting for device confirmation...',
        loading: true
      });

      // Wait 5 seconds for device to process command
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      // Fetch the latest state
      const latestState = await fetchDeviceState();
      
      // Update the UI with the new state
      if (latestState) {
        setMotorSpeed(latestState.motor_speed?.toString() || "0");
        setCommandFeedback({
          show: true,
          message: 'Speed command confirmed!',
          loading: false
        });
      } else {
        setCommandFeedback({
          show: true,
          message: 'Speed command failed to verify',
          loading: false
        });
      }
    } catch (error) {
      setError(error.message);
      setCommandFeedback({
        show: true,
        message: error.message || 'Failed to send speed command',
        loading: false
      });
    } finally {
      setIsVerifying(false);
      setTimeout(() => {
        setCommandFeedback({ show: false, message: '', loading: false });
      }, 2000);
    }
  };

  const handleRestart = async () => {
    if (isVerifying) return;

    try {
      setIsVerifying(true);
      setError(null);
      setCommandFeedback({
        show: true,
        message: 'Sending restart command...',
        loading: true
      });

      await sendCommand('RESTART');

      setCommandFeedback({
        show: true,
        message: 'Waiting for device confirmation...',
        loading: true
      });

      // Wait 5 seconds for device to process command
      await new Promise(resolve => setTimeout(resolve, 5000));

      const finalState = await fetchDeviceState();
      const success = verifyCommandSuccess('RESTART', {}, finalState);

      if (success) {
        setCommandFeedback({
          show: true,
          message: 'Restart command confirmed!',
          loading: false
        });
      } else {
        setCommandFeedback({
          show: true,
          message: 'Restart command failed to verify',
          loading: false
        });
      }

      if (onCommandSend) {
        onCommandSend();
      }
    } catch (error) {
      setError(error.message);
      setCommandFeedback({
        show: true,
        message: 'Failed to send restart command',
        loading: false
      });
    } finally {
      setIsVerifying(false);
      setTimeout(() => {
        setCommandFeedback({ show: false, message: '', loading: false });
      }, 2000);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          LED Controls
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography sx={{ mr: 2 }}>LED 1</Typography>
          <Switch
            checked={led1State}
            onChange={(e) => handleSwitchChange(1, e.target.checked)}
            disabled={isVerifying}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography sx={{ mr: 2 }}>LED 2</Typography>
          <Switch
            checked={led2State}
            onChange={(e) => handleSwitchChange(2, e.target.checked)}
            disabled={isVerifying}
          />
        </Box>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Motor Control
        </Typography>
        <Box component="form" onSubmit={handleSpeedSubmit} sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label="Motor Speed (0-100)"
            type="number"
            value={motorSpeed}
            onChange={(e) => setMotorSpeed(e.target.value)}
            disabled={isVerifying}
            sx={{ flex: 1 }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={isVerifying}
          >
            Set Speed
          </Button>
        </Box>
        {deviceState?.motor_speed !== undefined && (
          <Typography sx={{ mt: 1 }}>
            Current Speed: {deviceState.motor_speed}%
          </Typography>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Device Control
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<RestartAltIcon />}
          onClick={handleRestart}
          disabled={isVerifying}
        >
          Restart Device
        </Button>
      </Paper>

      {isVerifying && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}

      <Snackbar
        open={commandFeedback.show}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          '& .MuiPaper-root': {
            bgcolor: 'background.paper',
            color: 'text.primary',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            minWidth: 250
          }
        }}
      >
        <Paper elevation={3}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2,
            p: 1.5
          }}>
            {commandFeedback.loading && (
              <CircularProgress size={20} color="primary" />
            )}
            <Typography variant="body2">
              {commandFeedback.message}
            </Typography>
          </Box>
        </Paper>
      </Snackbar>
    </Box>
  );
};

export default DashboardCommands; 