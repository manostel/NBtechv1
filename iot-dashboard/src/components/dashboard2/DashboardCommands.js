import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Switch, 
  TextField, 
  Button, 
  CircularProgress, 
  Snackbar,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import SpeedIcon from '@mui/icons-material/Speed';
import BatterySaverIcon from '@mui/icons-material/BatterySaver';
import PowerIcon from '@mui/icons-material/Power';

const COMMAND_API_URL = 'https://61dd7wovqk.execute-api.eu-central-1.amazonaws.com/default/send-command';
const STATUS_API_URL = 'https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/data-dashboard-state';

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

  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress size={60} />
        <Typography variant="body2" color="text.secondary">
          Processing command...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 0 }}>
      <Grid container spacing={1}>
        {/* Output Controls Card */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ 
            height: '100%',
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid #f0f0f0',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              transform: 'translateY(-2px)'
            }
          }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ 
                  p: 1, 
                  borderRadius: 1, 
                  bgcolor: 'primary.dark',
                  mr: 1.5
                }}>
                  <PowerIcon sx={{ color: 'white', fontSize: '1.2rem' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, fontSize: '1.1rem' }}>
                    Output Controls
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                    Toggle device outputs on/off
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {/* Output 1 */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  p: 1.5,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      Output 1
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {output1State ? 'ON' : 'OFF'}
                    </Typography>
                  </Box>
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

                {/* Output 2 */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  p: 1.5,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      Output 2
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {output2State ? 'ON' : 'OFF'}
                    </Typography>
                  </Box>
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
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Motor Speed Card */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ 
            height: '100%',
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid #f0f0f0',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              transform: 'translateY(-2px)'
            }
          }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ 
                  p: 1, 
                  borderRadius: 1, 
                  bgcolor: '#1565c0',
                  mr: 1.5
                }}>
                  <SpeedIcon sx={{ color: 'white', fontSize: '1.2rem' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, fontSize: '1.1rem' }}>
                    Motor Speed
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                    Control motor speed (0-100%)
                  </Typography>
                </Box>
              </Box>

              <form onSubmit={handleSpeedSubmit}>
                <TextField
                  label="Speed (0-100)"
                  type="number"
                  value={motorSpeed}
                  onChange={(e) => setMotorSpeed(e.target.value)}
                  inputProps={{ min: 0, max: 100, step: 1 }}
                  fullWidth
                  variant="outlined"
                  disabled={isVerifying}
                  sx={{
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={isVerifying}
                  startIcon={isVerifying ? <CircularProgress size={20} /> : <SpeedIcon />}
                  sx={{
                    height: '40px',
                    borderRadius: 2,
                    fontWeight: 600,
                    textTransform: 'none',
                    bgcolor: '#1565c0',
                    '&:hover': {
                      bgcolor: '#0d47a1'
                    }
                  }}
                >
                  {isVerifying ? 'Setting Speed...' : 'Set Speed'}
                </Button>
              </form>

              {commandFeedback.show && (
                <Box sx={{ mt: 2 }}>
                  <Chip
                    label={commandFeedback.message}
                    color={commandFeedback.loading ? 'default' : 'success'}
                    variant="outlined"
                    icon={commandFeedback.loading ? <CircularProgress size={16} /> : null}
                  />
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Power Saving & Actions Card */}
      <Grid item xs={12} sm={12} md={4}>
        <Card sx={{ 
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid #f0f0f0',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            transform: 'translateY(-2px)'
          }
        }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Power Saving */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{ 
                    p: 1, 
                    borderRadius: 1, 
                    bgcolor: 'success.dark',
                    mr: 1.5
                  }}>
                    <BatterySaverIcon sx={{ color: 'white', fontSize: '1.2rem' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, fontSize: '1.1rem' }}>
                      Power Saving Mode
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                      Enable energy-efficient operation
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  p: 1.5,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      Power Saving
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {powerSavingMode ? 'ENABLED' : 'DISABLED'}
                    </Typography>
                  </Box>
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
              </Box>

              {/* Device Actions */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{ 
                    p: 1, 
                    borderRadius: 1, 
                    bgcolor: '#d32f2f',
                    mr: 1.5
                  }}>
                    <RestartAltIcon sx={{ color: 'white', fontSize: '1.2rem' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, fontSize: '1.1rem' }}>
                      Device Actions
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                      Restart and system controls
                    </Typography>
                  </Box>
                </Box>

                <Button
                  variant="contained"
                  startIcon={<RestartAltIcon />}
                  onClick={handleRestart}
                  fullWidth
                  disabled={isLoading}
                  sx={{
                    height: '40px',
                    borderRadius: 2,
                    fontWeight: 600,
                    textTransform: 'none',
                    bgcolor: '#d32f2f',
                    '&:hover': {
                      bgcolor: '#b71c1c'
                    }
                  }}
                >
                  Restart Device
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>

    {/* Command Feedback Snackbar */}
    {commandFeedback.show && (
      <Snackbar
        open={commandFeedback.show}
        autoHideDuration={commandFeedback.loading ? null : 3000}
        onClose={() => setCommandFeedback({ ...commandFeedback, show: false })}
        message={commandFeedback.message}
        action={commandFeedback.loading && <CircularProgress color="inherit" size={20} />}
      />
    )}
  </Box>
  );
};

export default DashboardCommands; 