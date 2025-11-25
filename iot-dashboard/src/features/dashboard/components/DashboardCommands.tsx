import React, { useState, useEffect } from 'react';
import { 
  Box, 
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SpeedIcon from '@mui/icons-material/Speed';
import BatterySaverIcon from '@mui/icons-material/BatterySaver';
import PowerIcon from '@mui/icons-material/Power';
import { Device } from '../../../types';
import { useTranslation } from 'react-i18next';

const COMMAND_API_URL = 'https://61dd7wovqk.execute-api.eu-central-1.amazonaws.com/default/send-command';
// const STATUS_API_URL = 'https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/data-dashboard-state';

interface DashboardCommandsProps {
  device: Device;
  deviceState: any;
  onCommandSend: (command: string, params?: any) => Promise<any>;
  fetchDeviceState: () => Promise<any>;
  setSnackbar: (snackbar: { open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }) => void;
  commandHistory?: any[];
  setCommandHistory?: (history: any[]) => void;
  metricsConfig?: any;
  metricsData?: any;
}

const DashboardCommands: React.FC<DashboardCommandsProps> = ({ 
  device, 
  deviceState, 
  // onCommandSend, // Not used in the original component, it defines its own sendCommand
  fetchDeviceState,
  setSnackbar
}) => {
  const { t } = useTranslation();
  const [output1State, setOutput1State] = useState(false);
  const [output2State, setOutput2State] = useState(false);
  const [motorSpeed, setMotorSpeed] = useState('');
  const [powerSavingMode, setPowerSavingMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // @ts-ignore
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState({
    show: false,
    message: '',
    loading: false
  });
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);

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

  /*
  const verifyCommandSuccess = (command: string, params: any, state: any) => {
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
  */

  const sendCommand = async (command: string, params = {}) => {
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

  const handleSwitchChange = async (led: number, isOn: boolean) => {
    setIsLoading(true);
    try {
      const command = isOn ? `TOGGLE_${led}_ON` : `TOGGLE_${led}_OFF`;
      
      // Send the command directly using the internal sendCommand function
      await sendCommand(command);

      
      // Wait for 5 seconds to allow the device to process the command
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // First verification
      // const latestState = await fetchDeviceState();
      await fetchDeviceState();
      
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
        message: t('commands.ledStateUpdated', { led }),
        severity: 'success'
      });
    } catch (error: any) {
      console.error('Error in handleSwitchChange:', error);
      setSnackbar({
        open: true,
        message: error.message || t('commands.failedUpdateSwitch'),
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePowerSavingChange = async (isOn: boolean) => {
    setIsLoading(true);
    try {
      const command = isOn ? 'POWER_SAVING_ON' : 'POWER_SAVING_OFF';
      
      // Send the command directly using the internal sendCommand function
      await sendCommand(command);

      
      // Wait for 5 seconds to allow the device to process the command
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // First verification
      // const latestState = await fetchDeviceState();
      await fetchDeviceState();
      
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
        message: t('commands.powerSavingUpdated', { state: isOn ? 'ON' : 'OFF' }),
        severity: 'success'
      });
    } catch (error: any) {
      console.error('Error in handlePowerSavingChange:', error);
      setSnackbar({
        open: true,
        message: error.message || t('commands.failedUpdatePowerSaving'),
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying) return;

    try {
      setIsVerifying(true);
      setError(null);
      setCommandFeedback({
        show: true,
        message: t('commands.sendingSpeedCommand'),
        loading: true
      });

      const speed = parseInt(motorSpeed);
      if (isNaN(speed) || speed < 0 || speed > 100) {
        throw new Error(t('commands.speedRangeError'));
      }

      // Send the command directly using the internal sendCommand function
      await sendCommand('SET_SPEED', { speed });

      // Wait for 5 seconds to allow the device to process the command
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // First verification
      // const latestState = await fetchDeviceState();
      await fetchDeviceState();
      
      // Additional verification after 10 seconds
      await new Promise(resolve => setTimeout(resolve, 10000));
      const finalState = await fetchDeviceState();
      
      if (finalState) {
        setMotorSpeed(finalState.motor_speed?.toString() || "0");
        setCommandFeedback({
          show: true,
          message: t('commands.speedUpdated'),
          loading: false
        });
      }
    } catch (error: any) {
      console.error('Error in handleSpeedSubmit:', error);
      setError(error.message);
      setCommandFeedback({
        show: true,
        message: error.message || t('commands.failedUpdateSpeed'),
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
        message: t('commands.restartCommandSent'),
        severity: 'success'
      });

      // Wait for 5 seconds to allow the device to process the command
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // First verification
      // const latestState = await fetchDeviceState();
      await fetchDeviceState();
      
      // Additional verification after 10 seconds
      await new Promise(resolve => setTimeout(resolve, 10000));
      const finalState = await fetchDeviceState();
      
      if (finalState) {
        setOutput1State(finalState.out1_state === 1);
        setOutput2State(finalState.out2_state === 1);
        setMotorSpeed(finalState.motor_speed?.toString() || "0");
        setPowerSavingMode(finalState.power_saving === 1);
      }
    } catch (error: any) {
      console.error('Error in handleRestart:', error);
      setSnackbar({
        open: true,
        message: error.message || t('commands.failedRestart'),
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openRestartDialog = () => setRestartDialogOpen(true);
  const closeRestartDialog = () => setRestartDialogOpen(false);
  const confirmRestart = async () => {
    closeRestartDialog();
    await handleRestart();
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
          {t('commands.processingCommand')}
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
            background: (theme) => theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.9) 0%, rgba(31, 37, 71, 0.95) 50%, rgba(26, 31, 60, 0.9) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 50%, rgba(255, 255, 255, 0.9) 100%)',
            backdropFilter: 'blur(12px)',
            boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 6px 24px rgba(0,0,0,0.35)' : '0 6px 24px rgba(0,0,0,0.08)',
            border: 'none',
            outline: 'none',
            color: (theme) => theme.palette.text.primary,
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            '&:focus, &:focus-visible, &:focus-within': {
              outline: 'none !important',
              boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 6px 24px rgba(0,0,0,0.35)' : '0 6px 24px rgba(0,0,0,0.08)',
              border: 'none !important'
            },
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: (theme) => theme.palette.mode === 'dark' ? 'linear-gradient(90deg, #4caf50, #2196f3)' : 'linear-gradient(90deg, #1976d2, #388e3c)',
              transition: 'background 0.3s ease',
            },
            '&:hover': {
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              transform: 'translateY(-2px)',
              '&::before': {
                background: (theme) => theme.palette.mode === 'dark' ? 'linear-gradient(90deg, #5cbf60, #3399f3)' : 'linear-gradient(90deg, #1e88e5, #43a047)',
              }
            }
          }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <PowerIcon sx={{ color: 'rgba(224, 224, 224, 0.7)', fontSize: '1.1rem', mr: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 500, color: '#E0E0E0' }}>
                  {t('commands.outputControls')}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {/* Output 1 */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  p: 1.25,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'rgba(0,0,0,0.02)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                      {t('commands.output1')}
                    </Typography>
                    <Chip 
                      size="small" 
                      label={output1State ? t('devices.on') : t('devices.off')} 
                      variant="outlined"
                      color={output1State ? 'success' : 'default'}
                      sx={{ fontSize: '0.75rem', height: '20px' }}
                    />
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
                  p: 1.25,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'rgba(0,0,0,0.02)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                      {t('commands.output2')}
                    </Typography>
                    <Chip 
                      size="small" 
                      label={output2State ? t('devices.on') : t('devices.off')} 
                      variant="outlined"
                      color={output2State ? 'success' : 'default'}
                      sx={{ fontSize: '0.75rem', height: '20px' }}
                    />
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
            background: 'linear-gradient(135deg, rgba(26, 31, 60, 0.85) 0%, rgba(31, 37, 71, 0.95) 50%, rgba(26, 31, 60, 0.85) 100%)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: 'none',
            color: '#E0E0E0',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #4caf50, #2196f3)',
              transition: 'background 0.3s ease',
            },
            '&:hover': {
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              transform: 'translateY(-2px)',
              '&::before': {
                background: 'linear-gradient(90deg, #5cbf60, #3399f3)',
              }
            }
          }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <SpeedIcon sx={{ color: 'rgba(224, 224, 224, 0.7)', fontSize: '1.1rem', mr: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 500, color: '#E0E0E0' }}>
                  {t('commands.motorSpeed')}
                </Typography>
              </Box>

              <form onSubmit={handleSpeedSubmit}>
                <TextField
                  label={t('commands.motorSpeed') + ' (0-100)'}
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
                    '& .MuiOutlinedInput-notchedOutline': {
                      border: 'none',
                    },
                    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                      border: 'none',
                    },
                    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      border: 'none',
                    },
                  }}
                />
                <Button
                  type="submit"
                  variant="outlined"
                  fullWidth
                  disabled={isVerifying}
                  startIcon={isVerifying ? <CircularProgress size={20} /> : <SpeedIcon />}
                  sx={{
                    height: '40px',
                    borderRadius: 2,
                    fontWeight: 500,
                    textTransform: 'none',
                    borderColor: 'text.secondary',
                    color: 'text.primary',
                    '&:hover': {
                      borderColor: 'text.primary',
                      backgroundColor: 'rgba(0,0,0,0.04)'
                    }
                  }}
                >
                  {isVerifying ? t('commands.sendingSpeedCommand') : t('commands.motorSpeed')}
                </Button>
              </form>

              {commandFeedback.show && (
                <Box sx={{ mt: 2 }}>
                  <Chip
                    label={commandFeedback.message}
                    color={commandFeedback.loading ? 'default' : 'success'}
                    variant="outlined"
                    icon={commandFeedback.loading ? <CircularProgress size={16} /> : undefined}
                  />
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Power Saving Tile */}
      <Grid item xs={12} sm={6} md={4}>
        <Card sx={{ 
          height: '100%',
          borderRadius: 3,
          background: (theme) => theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.9) 0%, rgba(31, 37, 71, 0.95) 50%, rgba(26, 31, 60, 0.9) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 50%, rgba(255, 255, 255, 0.9) 100%)',
          backdropFilter: 'blur(12px)',
          boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 6px 24px rgba(0,0,0,0.35)' : '0 6px 24px rgba(0,0,0,0.08)',
          border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
          color: (theme) => theme.palette.text.primary,
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: (theme) => theme.palette.mode === 'dark' ? 'linear-gradient(90deg, #4caf50, #2196f3)' : 'linear-gradient(90deg, #1976d2, #388e3c)'
          },
        }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
              <BatterySaverIcon sx={{ fontSize: '1.1rem', color: 'rgba(224, 224, 224, 0.7)', mr: 1 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 500, color: '#E0E0E0' }}>
                {t('commands.powerSaving')}
              </Typography>
            </Box>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              p: 1.25,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'rgba(0,0,0,0.02)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                  {t('common.status', { defaultValue: 'Status' })}
                </Typography>
                <Chip 
                  size="small" 
                  label={powerSavingMode ? t('alarms.enabled') : t('alarms.disabled')} 
                  variant="outlined"
                  color={powerSavingMode ? 'success' : 'default'}
                  sx={{ fontSize: '0.75rem', height: '20px' }}
                />
              </Box>
              <Switch
                checked={powerSavingMode}
                onChange={(e) => handlePowerSavingChange(e.target.checked)}
                inputProps={{ 'aria-label': 'Power Saving Mode switch' }}
                size="small"
                sx={{
                  '& .MuiSwitch-switchBase': { borderRadius: '16px' },
                  '& .MuiSwitch-thumb': { borderRadius: '16px' },
                  '& .MuiSwitch-track': { borderRadius: '16px' },
                }}
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Restart Device Tile */}
      <Grid item xs={12} sm={6} md={4}>
        <Card sx={{ 
          height: '100%',
          borderRadius: 3,
          background: (theme) => theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.9) 0%, rgba(31, 37, 71, 0.95) 50%, rgba(26, 31, 60, 0.9) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 50%, rgba(255, 255, 255, 0.9) 100%)',
          backdropFilter: 'blur(12px)',
          boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 6px 24px rgba(0,0,0,0.35)' : '0 6px 24px rgba(0,0,0,0.08)',
          border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
          color: (theme) => theme.palette.text.primary,
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: (theme) => theme.palette.mode === 'dark' ? 'linear-gradient(90deg, #f44336, #ff9800)' : 'linear-gradient(90deg, #e53935, #fb8c00)'
          },
        }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
              <RestartAltIcon sx={{ fontSize: '1.1rem', color: 'rgba(224, 224, 224, 0.7)', mr: 1 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 500, color: '#E0E0E0' }}>
                {t('commands.restartDevice')}
              </Typography>
            </Box>

            <Button
              variant="outlined"
              startIcon={<RestartAltIcon />}
              onClick={openRestartDialog}
              fullWidth
              disabled={isLoading}
              sx={{
                height: '40px',
                borderRadius: 2,
                fontWeight: 500,
                textTransform: 'none',
                borderColor: 'error.main',
                color: 'error.main',
                '&:hover': {
                  borderColor: 'error.dark',
                  backgroundColor: 'rgba(244, 67, 54, 0.04)'
                }
              }}
            >
              {t('commands.restart')}
            </Button>
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

    {/* Restart Confirmation Dialog */}
    <Dialog open={restartDialogOpen} onClose={closeRestartDialog} maxWidth="xs" fullWidth>
      <DialogTitle>{t('commands.restartDevice')}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t('commands.restartConfirm')}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeRestartDialog} variant="outlined">{t('common.cancel')}</Button>
        <Button onClick={confirmRestart} variant="contained" color="error">{t('commands.restart')}</Button>
      </DialogActions>
    </Dialog>
  </Box>
  );
};

export default DashboardCommands;

