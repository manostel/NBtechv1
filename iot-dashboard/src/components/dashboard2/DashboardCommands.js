import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Switch, TextField, Button, CircularProgress, Snackbar } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';

const COMMAND_API_URL = 'https://61dd7wovqk.execute-api.eu-central-1.amazonaws.com/default/send-command';
const STATUS_API_URL = 'https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-data-status';

const DashboardCommands = ({ 
  device, 
  deviceState, 
  onCommandSend,
  fetchDeviceState,
  setSnackbar
}) => {
  const [output1State, setOutput1State] = useState(false);
  const [output2State, setOutput2State] = useState(false);
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
      setOutput1State(deviceState.out1_state === 1);
      setOutput2State(deviceState.out2_state === 1);
      setPowerSavingMode(deviceState.power_saving === 1);
      if (deviceState.motor_speed !== undefined) {
        setMotorSpeed(deviceState.motor_speed.toString());
      }
    }
  }, [deviceState]);

  const verifyCommandSuccess = (command, params, state) => {
    if (!state) return false;

    switch (command) {
      case 'TOGGLE_1_ON':
        return state.out1_state === 1;
      case 'TOGGLE_1_OFF':
        return state.out1_state === 0;
      case 'TOGGLE_2_ON':
        return state.out2_state === 1;
      case 'TOGGLE_2_OFF':
        return state.out2_state === 0;
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
        command: command,
        ...params
      };


      const response = await fetch(COMMAND_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send command');
      }

      // The API might return a success response without a body
      if (response.status === 200) {
        return { success: true }; // Return a success object
      }

      // If there is a response body, try to parse it
      const result = await response.json();
      if (result && result.success) {
        return result;
      }

      throw new Error(result?.error || 'Failed to send command');
    } catch (error) {
      console.error('Error sending command:', error);
      throw error;
    }
  };

  const handleSwitchChange = async (led, isOn) => {
    setIsLoading(true);
    try {
      const command = isOn ? `TOGGLE_${led}_ON` : `TOGGLE_${led}_OFF`;
      
      // Send the command directly using the internal sendCommand function
      await sendCommand(command);

      
      // Wait for 5 seconds to allow the device to process the command
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // First verification
      const latestState = await fetchDeviceState();
      
      // Additional verification after 10 seconds
      await new Promise(resolve => setTimeout(resolve, 10000));
      const finalState = await fetchDeviceState();
      
      // Update the UI with the final state
      if (finalState) {
        setOutput1State(finalState.out1_state === 1);
        setOutput2State(finalState.out2_state === 1);
        setMotorSpeed(finalState.motor_speed?.toString() || "0"); // Ensure motor speed is also updated
        setPowerSavingMode(finalState.power_saving === 1);
      }
      setSnackbar({
        open: true,
        message: `LED ${led} state updated successfully`,
        severity: 'success'
      });
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
      
      // Send the command directly using the internal sendCommand function
      await sendCommand(command);

      
      // Wait for 5 seconds to allow the device to process the command
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // First verification
      const latestState = await fetchDeviceState();
      
      // Additional verification after 10 seconds
      await new Promise(resolve => setTimeout(resolve, 10000));
      const finalState = await fetchDeviceState();
      
      // Update the UI with the final state
      if (finalState) {
        setOutput1State(finalState.out1_state === 1); // Ensure Output states are updated
        setOutput2State(finalState.out2_state === 1); // Ensure Output states are updated
        setMotorSpeed(finalState.motor_speed?.toString() || "0"); // Ensure motor speed is also updated
        setPowerSavingMode(finalState.power_saving === 1);
      }
      setSnackbar({
        open: true,
        message: `Power saving mode updated to ${isOn ? 'ON' : 'OFF'}`,
        severity: 'success'
      });
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
        message: 'Sending speed command...',
        loading: true
      });

      const speed = parseInt(motorSpeed);
      if (isNaN(speed) || speed < 0 || speed > 100) {
        throw new Error('Speed must be between 0 and 100');
      }

      // Send the command directly using the internal sendCommand function
      await sendCommand('SET_SPEED', { speed });

      // Wait for 5 seconds to allow the device to process the command
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // First verification
      const latestState = await fetchDeviceState();
      
      // Additional verification after 10 seconds
      await new Promise(resolve => setTimeout(resolve, 10000));
      const finalState = await fetchDeviceState();
      
      if (finalState) {
        setMotorSpeed(finalState.motor_speed?.toString() || "0");
        setCommandFeedback({
          show: true,
          message: 'Speed updated successfully',
          loading: false
        });
      }
    } catch (error) {
      console.error('Error in handleSpeedSubmit:', error);
      setError(error.message);
      setCommandFeedback({
        show: true,
        message: error.message || 'Failed to update speed',
        loading: false
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRestart = async () => {
    setIsLoading(true);
    try {
      // Send the command directly using the internal sendCommand function
      await sendCommand('RESTART');

      setSnackbar({
        open: true,
        message: 'Restart command sent successfully',
        severity: 'success'
      });

      // Wait for 5 seconds to allow the device to process the command
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // First verification
      const latestState = await fetchDeviceState();
      
      // Additional verification after 10 seconds
      await new Promise(resolve => setTimeout(resolve, 10000));
      const finalState = await fetchDeviceState();
      
      if (finalState) {
        setOutput1State(finalState.out1_state === 1);
        setOutput2State(finalState.out2_state === 1);
        setMotorSpeed(finalState.motor_speed?.toString() || "0");
        setPowerSavingMode(finalState.power_saving === 1);
      }
    } catch (error) {
      console.error('Error in handleRestart:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to restart device',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 2 }}>
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
        </Box>
      )}
      {!isLoading && (
        <>
          <Typography variant="subtitle1" sx={{ fontSize: '1rem', fontWeight: 400, mb: 0.5 }}>Output Control</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography sx={{ fontSize: '0.95rem' }}>Output 1</Typography>
            <Switch
              checked={output1State}
              onChange={(e) => handleSwitchChange(1, e.target.checked)}
              inputProps={{ 'aria-label': 'Output 1 switch' }}
              size="small"
              sx={{
                '& .MuiSwitch-switchBase': {
                  borderRadius: '16px',
                },
                '& .MuiSwitch-thumb': {
                  borderRadius: '16px',
                },
                '& .MuiSwitch-track': {
                  borderRadius: '16px',
                },
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography sx={{ fontSize: '0.95rem' }}>Output 2</Typography>
            <Switch
              checked={output2State}
              onChange={(e) => handleSwitchChange(2, e.target.checked)}
              inputProps={{ 'aria-label': 'Output 2 switch' }}
              size="small"
              sx={{
                '& .MuiSwitch-switchBase': {
                  borderRadius: '16px',
                },
                '& .MuiSwitch-thumb': {
                  borderRadius: '16px',
                },
                '& .MuiSwitch-track': {
                  borderRadius: '16px',
                },
              }}
            />
          </Box>

          <Typography variant="subtitle1" sx={{ fontSize: '1rem', fontWeight: 400, mt: 1, mb: 0.5 }}>Motor Speed</Typography>
          <form onSubmit={handleSpeedSubmit} style={{ width: '100%' }}>
            <TextField
              label="Speed (0-100)"
              type="number"
              value={motorSpeed}
              onChange={(e) => setMotorSpeed(e.target.value)}
              inputProps={{ min: 0, max: 100, step: 1, style: { height: '32px', fontSize: '0.8rem', borderRadius: 20, padding: '0 12px' } }}
              fullWidth
              variant="outlined"
              margin="normal"
              disabled={isVerifying}
              sx={{
                height: '32px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '20px',
                  height: '32px',
                  fontSize: '0.8rem',
                  padding: '0 12px',
                },
                '& .MuiInputBase-input': {
                  height: '32px',
                  padding: '0 12px',
                  fontSize: '0.8rem',
                },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={isVerifying}
              sx={{
                mt: 0.5,
                height: '32px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                px: 2
              }}
            >
              {isVerifying ? <CircularProgress size={24} /> : 'Set Speed'}
            </Button>
          </form>

          {commandFeedback.show && (
            <Snackbar
              open={commandFeedback.show}
              autoHideDuration={commandFeedback.loading ? null : 3000}
              onClose={() => setCommandFeedback({ ...commandFeedback, show: false })}
              message={commandFeedback.message}
              action={commandFeedback.loading && <CircularProgress color="inherit" size={20} />}
            />
          )}

          <Typography variant="subtitle1" sx={{ fontSize: '1rem', fontWeight: 400, mt: 1, mb: 0.5 }}>Power Saving Mode</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography sx={{ fontSize: '0.95rem' }}>Enable Power Saving</Typography>
            <Switch
              checked={powerSavingMode}
              onChange={(e) => handlePowerSavingChange(e.target.checked)}
              inputProps={{ 'aria-label': 'Power Saving Mode switch' }}
              size="small"
              sx={{
                '& .MuiSwitch-switchBase': {
                  borderRadius: '16px',
                },
                '& .MuiSwitch-thumb': {
                  borderRadius: '16px',
                },
                '& .MuiSwitch-track': {
                  borderRadius: '16px',
                },
              }}
            />
          </Box>


          <Typography variant="subtitle1" sx={{ fontSize: '1rem', fontWeight: 400, mt: 1, mb: 0.5 }}>Device Actions</Typography>
          <Button
            variant="contained"
            color="error"
            startIcon={<RestartAltIcon />}
            onClick={handleRestart}
            fullWidth
            disabled={isLoading}
            sx={{
              height: '32px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              px: 2
            }}
          >
            Restart Device
          </Button>
        </>
      )}
    </Paper>
  );
};

export default DashboardCommands; 