import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Switch, TextField, Button, CircularProgress, Snackbar } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';

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
  const [powerSavingMode, setPowerSavingMode] = useState(false);
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
      setPowerSavingMode(deviceState.power_saving === 1);
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
    setIsLoading(true);
    try {
      const command = isOn ? `TOGGLE_${led}_ON` : `TOGGLE_${led}_OFF`;
      console.log('Sending switch command:', command);
      
      // Send the command
      await handleCommandSend(command);
      console.log('Command sent successfully');
      
      // Wait for 5 seconds to allow the device to process the command
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log('First verification after 5s');
      
      // First verification
      const latestState = await fetchDeviceState();
      console.log('First verification state:', latestState);
      
      // Additional verification after 10 seconds (increased from 2s)
      await new Promise(resolve => setTimeout(resolve, 10000));
      console.log('Second verification after 10s');
      const finalState = await fetchDeviceState();
      console.log('Final verification state:', finalState);
      
      // Update the UI with the final state
      if (finalState) {
        console.log('Updating UI with final state:', finalState);
        setLed1State(finalState.led1_state === 1);
        setLed2State(finalState.led2_state === 1);
        setMotorSpeed(finalState.motor_speed?.toString() || "0");
        setPowerSavingMode(finalState.power_saving === 1);
      }
    } catch (error) {
      console.error('Error in handleSwitchChange:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to update switch state',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePowerSavingChange = async (isOn) => {
    setIsLoading(true);
    try {
      const command = isOn ? 'POWER_SAVING_ON' : 'POWER_SAVING_OFF';
      console.log('Sending power saving command:', command);
      
      // Send the command
      await handleCommandSend(command);
      console.log('Command sent successfully');
      
      // Wait for 5 seconds to allow the device to process the command
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log('First verification after 5s');
      
      // First verification
      const latestState = await fetchDeviceState();
      console.log('First verification state:', latestState);
      
      // Additional verification after 10 seconds (increased from 2s)
      await new Promise(resolve => setTimeout(resolve, 10000));
      console.log('Second verification after 10s');
      const finalState = await fetchDeviceState();
      console.log('Final verification state:', finalState);
      
      // Update the UI with the final state
      if (finalState) {
        console.log('Updating UI with final state:', finalState);
        setPowerSavingMode(finalState.power_saving === 1);
      }
    } catch (error) {
      console.error('Error in handlePowerSavingChange:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to update power saving mode',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
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

      // Get the speed value from the input field
      const speed = parseInt(motorSpeed);
      if (isNaN(speed) || speed < 0 || speed > 100) {
        throw new Error('Speed must be between 0 and 100');
      }

      console.log('Sending speed command with value:', speed);
      
      // Send the command with the speed parameter
      await handleCommandSend('SET_SPEED', { speed: speed });
      console.log('Command sent successfully');
      
      setCommandFeedback({
        show: true,
        message: 'Waiting for device confirmation...',
        loading: true
      });

      // Wait 5 seconds for device to process command
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log('First verification after 5s');
      
      // First verification
      const latestState = await fetchDeviceState();
      console.log('First verification state:', latestState);
      
      // Additional verification after 10 seconds (increased from 2s)
      await new Promise(resolve => setTimeout(resolve, 10000));
      console.log('Second verification after 10s');
      const finalState = await fetchDeviceState();
      console.log('Final verification state:', finalState);
      
      // Update the UI with the final state
      if (finalState) {
        console.log('Updating UI with final state:', finalState);
        // Only update if the speed matches what we sent
        if (finalState.motor_speed === speed) {
        setCommandFeedback({
          show: true,
          message: 'Speed command confirmed!',
          loading: false
        });
        } else {
          setCommandFeedback({
            show: true,
            message: 'Speed command verification failed - speed mismatch',
            loading: false
          });
        }
      } else {
        setCommandFeedback({
          show: true,
          message: 'Speed command failed to verify',
          loading: false
        });
      }
    } catch (error) {
      console.error('Error in handleSpeedSubmit:', error);
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

      console.log('Sending restart command');

      // Send the command
      await handleCommandSend('RESTART');
      console.log('Command sent successfully');
      
      setCommandFeedback({
        show: true,
        message: 'Waiting for device confirmation...',
        loading: true
      });

      // Wait for device to process command
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log('First verification after 5s');
      
      // First verification
      const latestState = await fetchDeviceState();
      console.log('First verification state:', latestState);
      
      // Additional verification after 10 seconds (increased from 2s)
      await new Promise(resolve => setTimeout(resolve, 10000));
      console.log('Second verification after 10s');
      const finalState = await fetchDeviceState();
      console.log('Final verification state:', finalState);
      
      // Update the UI with the final state
      if (finalState) {
        console.log('Updating UI with final state:', finalState);
        setLed1State(finalState.led1_state === 1);
        setLed2State(finalState.led2_state === 1);
        setMotorSpeed(finalState.motor_speed?.toString() || "0");
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
    } catch (error) {
      console.error('Error in handleRestart:', error);
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
            disabled={isLoading || isVerifying}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography sx={{ mr: 2 }}>LED 2</Typography>
          <Switch
            checked={led2State}
            onChange={(e) => handleSwitchChange(2, e.target.checked)}
            disabled={isLoading || isVerifying}
          />
        </Box>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Power Saving Mode
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography sx={{ mr: 2 }}>Power Saving</Typography>
          <Switch
            checked={powerSavingMode}
            onChange={(e) => handlePowerSavingChange(e.target.checked)}
            disabled={isLoading || isVerifying}
            color="primary"
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
            disabled={isLoading || isVerifying}
            sx={{ flex: 1 }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading || isVerifying}
          >
            {isVerifying ? <CircularProgress size={24} /> : 'Set Speed'}
          </Button>
        </Box>
        {deviceState?.motor_speed !== undefined && (
          <Typography sx={{ mt: 1 }}>
            Current Speed: {deviceState.motor_speed}%
          </Typography>
        )}
        {error && (
          <Typography color="error" sx={{ mt: 1 }}>
            {error}
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
          disabled={isLoading || isVerifying}
        >
          {isVerifying ? <CircularProgress size={24} /> : 'Restart Device'}
        </Button>
      </Paper>

      {isLoading && (
        <Box sx={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          zIndex: 1000
        }}>
          <CircularProgress />
        </Box>
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