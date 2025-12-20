import React, { useState, useEffect, useRef, useCallback } from 'react';
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
// WebSocket status icons (for future use)
// import WifiIcon from '@mui/icons-material/Wifi';
// import WifiOffIcon from '@mui/icons-material/WifiOff';
import { Device } from '../../../types';
import { useTranslation } from 'react-i18next';
import notificationManager from '../../../services/NotificationManager';

const COMMAND_API_URL = 'https://61dd7wovqk.execute-api.eu-central-1.amazonaws.com/default/send-command';
// Device Shadow state API (source of truth for device state - no fallback)
const SHADOW_STATE_API_URL = 'https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/fetch-device-shadow-state';
// Device Shadow update API (direct shadow updates - professional approach)
const SHADOW_UPDATE_API_URL = 'https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/update-device-shadow';
// WebSocket URL for real-time updates
const WEBSOCKET_URL = 'wss://2e3uhs3ur2.execute-api.eu-central-1.amazonaws.com/production';

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
  // fetchDeviceState, // Not used - we use fetchDeviceStateFromShadow instead
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
  // Pending states for individual toggles
  const [output1Pending, setOutput1Pending] = useState(false);
  const [output2Pending, setOutput2Pending] = useState(false);
  const [powerSavingPending, setPowerSavingPending] = useState(false);
  
  // Refs to track pending state in WebSocket callback (avoid stale closures)
  const output1PendingRef = useRef(false);
  const output2PendingRef = useRef(false);
  const powerSavingPendingRef = useRef(false);
  const output1ExpectedRef = useRef(false);
  const output2ExpectedRef = useRef(false);
  const powerSavingExpectedRef = useRef(false);
  const [commandFeedback, setCommandFeedback] = useState({
    show: false,
    message: '',
    loading: false
  });
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  
  // WebSocket state
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // WebSocket connection handler
  const connectWebSocket = useCallback(() => {
    if (!device?.client_id || WEBSOCKET_URL.includes('YOUR_API_ID')) {
      console.log('⚠️ WebSocket not configured or no device');
      return;
    }

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const url = `${WEBSOCKET_URL}?client_id=${device.client_id}`;
      console.log('🔌 Connecting WebSocket:', url);
      
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 WebSocket message:', message);

          if (message.type === 'SHADOW_UPDATE' && message.client_id === device.client_id) {
            const reported = message.reported;
            const newOut1 = reported.out1_state === 1;
            const newOut2 = reported.out2_state === 1;
            const newPowerSaving = reported.power_saving === 1;
            
            // Update OUT1: if pending, only accept if matches expected
            if (!output1PendingRef.current) {
              setOutput1State(newOut1);
            } else if (newOut1 === output1ExpectedRef.current) {
              // Confirmed! Now update the state
              setOutput1State(newOut1);
              setOutput1Pending(false);
              output1PendingRef.current = false;
              console.log('✅ OUT1 confirmed');
            } else {
              console.log('⏳ Ignoring stale OUT1 update');
            }
            
            // Update OUT2
            if (!output2PendingRef.current) {
              setOutput2State(newOut2);
            } else if (newOut2 === output2ExpectedRef.current) {
              // Confirmed! Now update the state
              setOutput2State(newOut2);
              setOutput2Pending(false);
              output2PendingRef.current = false;
              console.log('✅ OUT2 confirmed');
            } else {
              console.log('⏳ Ignoring stale OUT2 update');
            }
            
            // Update motor speed (always update)
            setMotorSpeed(reported.motor_speed?.toString() || '0');
            
            // Update power saving
            if (!powerSavingPendingRef.current) {
              setPowerSavingMode(newPowerSaving);
            } else if (newPowerSaving === powerSavingExpectedRef.current) {
              // Confirmed! Now update the state
              setPowerSavingMode(newPowerSaving);
              setPowerSavingPending(false);
              powerSavingPendingRef.current = false;
              console.log('✅ Power saving confirmed');
            } else {
              console.log('⏳ Ignoring stale power saving update');
            }
            
            setIsVerifying(false);
            setCommandFeedback({ show: false, message: '', loading: false });
            
            console.log('✅ State updated via WebSocket');
          }
        } catch (e) {
          console.error('❌ Error parsing WebSocket message:', e);
        }
      };

      ws.onerror = (event) => {
        console.error('❌ WebSocket error:', event);
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code);
        setWsConnected(false);
        wsRef.current = null;

        // Reconnect after 5 seconds
        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Reconnecting WebSocket...');
            connectWebSocket();
          }, 5000);
        }
      };
    } catch (e) {
      console.error('❌ Error creating WebSocket:', e);
    }
  }, [device?.client_id]);

  // Connect WebSocket on mount
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmount');
      }
    };
  }, [connectWebSocket]);

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

  // Fetch device state from Device Shadow (source of truth - no fallback)
  const fetchDeviceStateFromShadow = async () => {
    try {
      if (!device || !device.client_id) {
        throw new Error('No device or client_id available');
      }

      const response = await fetch(SHADOW_STATE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: device.client_id
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.state) {
        // Map shadow state format to frontend format
        return {
          client_id: result.state.client_id,
          timestamp: result.state.timestamp,
          out1_state: result.state.out1_state,
          out2_state: result.state.out2_state,
          motor_speed: result.state.motor_speed,
          power_saving: result.state.power_saving,
          in1_state: result.state.in1_state,
          in2_state: result.state.in2_state,
          charging: result.state.charging,
          connection_status: result.state.connection_status
        };
      }
      
      console.warn('⚠️ Shadow response did not contain state');
      return null;
    } catch (error: any) {
      console.error('❌ Error fetching device state from Shadow:', error);
      setError(error.message || 'Failed to fetch device state from Shadow');
      return null;
    }
  };

  // Professional: Update Device Shadow desired state directly
  // Device is subscribed to delta topics, so it will process immediately
  const updateShadowDesiredState = async (desiredState: Record<string, any>) => {
    try {
      if (!device || !device.client_id) {
        throw new Error('No device or client_id available');
      }

      const response = await fetch(SHADOW_UPDATE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: device.client_id,
          desired_state: desiredState
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Return current state if available
      if (result.currentState) {
        return {
          success: true,
          currentState: result.currentState,
          desiredState: result.desiredState
        };
      }

      return { success: true, desiredState: result.desiredState };
    } catch (error: any) {
      console.error('Error updating shadow desired state:', error);
      throw error;
    }
  };

  const sendCommand = async (command: string, params = {}) => {
    try {
      if (!device || !device.client_id) {
        throw new Error('No device or client_id available');
      }

      // Professional: Map commands to shadow desired state and update directly
      // Device is subscribed to delta topics, so it processes immediately
      let desiredState: Record<string, any> = {};
      
      if (command === "TOGGLE_1_ON") {
        desiredState = { OUT1: 1 };
      } else if (command === "TOGGLE_1_OFF") {
        desiredState = { OUT1: 0 };
      } else if (command === "TOGGLE_2_ON") {
        desiredState = { OUT2: 1 };
      } else if (command === "TOGGLE_2_OFF") {
        desiredState = { OUT2: 0 };
      } else if (command === "SET_SPEED") {
        const speed = (params as any).speed || parseInt(motorSpeed);
        if (isNaN(speed) || speed < 0 || speed > 255) {
          throw new Error('Speed must be between 0 and 255');
        }
        desiredState = { motor_speed: speed };
      } else if (command === "POWER_SAVING_ON") {
        desiredState = { power_saving: 1 };
      } else if (command === "POWER_SAVING_OFF") {
        desiredState = { power_saving: 0 };
      } else if (command === "RESTART") {
        // RESTART is a special action command - use MQTT topic (not state)
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
        return { success: true };
      } else {
        throw new Error(`Unknown command: ${command}`);
      }

      // Update shadow desired state directly (professional approach)
      return await updateShadowDesiredState(desiredState);
    } catch (error) {
      console.error('Error sending command:', error);
      throw error;
    }
  };

  const handleSwitchChange = async (led: number, isOn: boolean) => {
    // NO optimistic update - keep current state, just show pending indicator
    // State changes only when WebSocket confirms
    if (led === 1) {
      setOutput1Pending(true);
      output1PendingRef.current = true;
      output1ExpectedRef.current = isOn;
    } else {
      setOutput2Pending(true);
      output2PendingRef.current = true;
      output2ExpectedRef.current = isOn;
    }
    
    const oldState = led === 1 ? output1State : output2State;
    
    try {
      const command = isOn ? `TOGGLE_${led}_ON` : `TOGGLE_${led}_OFF`;
      
      // Send the command
      await sendCommand(command);
      console.log('📡 Command sent - waiting for WebSocket real-time update');
      
      // Timeout: if WebSocket doesn't update in 40 seconds, fetch actual state from shadow
      setTimeout(async () => {
        if ((led === 1 && output1PendingRef.current) || (led === 2 && output2PendingRef.current)) {
          console.warn('⚠️ WebSocket update timeout - fetching actual state from shadow');
          
          // Fetch actual state from shadow instead of assuming rollback
          const actualState = await fetchDeviceStateFromShadow();
          
          if (actualState) {
            if (led === 1) {
              setOutput1State(actualState.out1_state === 1);
              setOutput1Pending(false);
              output1PendingRef.current = false;
            } else {
              setOutput2State(actualState.out2_state === 1);
              setOutput2Pending(false);
              output2PendingRef.current = false;
            }
            console.log('✅ Updated state from shadow after timeout');
          } else {
            // Fallback: rollback if fetch failed
            console.warn('⚠️ Failed to fetch shadow state, rolling back');
            if (led === 1) {
              setOutput1State(oldState);
              setOutput1Pending(false);
              output1PendingRef.current = false;
            } else {
              setOutput2State(oldState);
              setOutput2Pending(false);
              output2PendingRef.current = false;
            }
          }
          
          setSnackbar({
            open: true,
            message: 'Device did not respond in time - state synced from shadow',
            severity: 'warning'
          });
        }
      }, 40000);
      
    } catch (error: any) {
      console.error('Error in handleSwitchChange:', error);
      // Rollback on error
      if (led === 1) {
        setOutput1State(oldState);
        setOutput1Pending(false);
        output1PendingRef.current = false;
      } else {
        setOutput2State(oldState);
        setOutput2Pending(false);
        output2PendingRef.current = false;
      }
      setSnackbar({
        open: true,
        message: error.message || t('commands.failedUpdateSwitch'),
        severity: 'error'
      });
    }
  };

  const handlePowerSavingChange = async (isOn: boolean) => {
    const oldState = powerSavingMode;
    
    // NO optimistic update - keep current state, just show pending indicator
    setPowerSavingPending(true);
    powerSavingPendingRef.current = true;
    powerSavingExpectedRef.current = isOn;
    
    try {
      const command = isOn ? 'POWER_SAVING_ON' : 'POWER_SAVING_OFF';
      await sendCommand(command);
      console.log('📡 Power saving command sent - waiting for WebSocket update');
      
      // Timeout: fetch actual state from shadow if no response
      setTimeout(async () => {
        if (powerSavingPendingRef.current) {
          console.warn('⚠️ Power saving WebSocket update timeout - fetching actual state from shadow');
          
          // Fetch actual state from shadow instead of assuming rollback
          const actualState = await fetchDeviceStateFromShadow();
          
          if (actualState) {
            setPowerSavingMode(actualState.power_saving === 1);
            setPowerSavingPending(false);
            powerSavingPendingRef.current = false;
            console.log('✅ Updated power saving state from shadow after timeout');
          } else {
            // Fallback: rollback if fetch failed
            console.warn('⚠️ Failed to fetch shadow state, rolling back');
            setPowerSavingMode(oldState);
            setPowerSavingPending(false);
            powerSavingPendingRef.current = false;
          }
          
          setSnackbar({
            open: true,
            message: 'Device did not respond in time - state synced from shadow',
            severity: 'warning'
          });
        }
      }, 40000);
      
    } catch (error: any) {
      console.error('Error in handlePowerSavingChange:', error);
      setPowerSavingMode(oldState); // Rollback
      setPowerSavingPending(false);
      powerSavingPendingRef.current = false;
      setSnackbar({
        open: true,
        message: error.message || t('commands.failedUpdatePowerSaving'),
        severity: 'error'
      });
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

      await sendCommand('SET_SPEED', { speed });
      console.log('📡 Speed command sent - waiting for WebSocket update');
      
      // Timeout fallback
      setTimeout(() => {
        if (isVerifying) {
          setIsVerifying(false);
          setCommandFeedback({
            show: true,
            message: 'Device did not respond in time',
            loading: false
          });
        }
      }, 40000);
      
    } catch (error: any) {
      console.error('Error in handleSpeedSubmit:', error);
      setError(error.message);
      setIsVerifying(false);
      setCommandFeedback({
        show: true,
        message: error.message || t('commands.failedUpdateSpeed'),
        loading: false
      });
    }
  };

  const handleRestart = async () => {
    setIsLoading(true);
    try {
      await sendCommand('RESTART');
      setSnackbar({
        open: true,
        message: t('commands.restartCommandSent'),
        severity: 'success'
      });
      // WebSocket will update state when device comes back online
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
                      label={output1Pending ? '' : (output1State ? t('devices.on') : t('devices.off'))} 
                      icon={output1Pending ? <CircularProgress size={12} color="inherit" /> : undefined}
                      variant="outlined"
                      color={output1Pending ? 'warning' : (output1State ? 'success' : 'default')}
                      sx={{ fontSize: '0.75rem', height: '20px', minWidth: output1Pending ? '40px' : 'auto' }}
                    />
                  </Box>
                  <Switch
                    checked={output1State}
                    onChange={(e) => handleSwitchChange(1, e.target.checked)}
                    disabled={output1Pending}
                    inputProps={{ 'aria-label': 'Output 1 switch' }}
                    size="small"
                    sx={{
                      // Disable slide animation when pending - snap instantly
                      '& .MuiSwitch-switchBase': {
                        borderRadius: '16px',
                        transition: output1Pending ? 'none' : undefined,
                      },
                      '& .MuiSwitch-thumb': {
                        borderRadius: '16px',
                        transition: output1Pending ? 'none' : undefined,
                        animation: output1Pending ? 'pulse 1s infinite' : 'none',
                      },
                      '& .MuiSwitch-track': {
                        borderRadius: '16px',
                        transition: output1Pending ? 'none' : undefined,
                        animation: output1Pending ? 'pulse 1s infinite' : 'none',
                      },
                      '@keyframes pulse': {
                        '0%, 100%': { opacity: 0.5 },
                        '50%': { opacity: 1 },
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
                      label={output2Pending ? '' : (output2State ? t('devices.on') : t('devices.off'))} 
                      icon={output2Pending ? <CircularProgress size={12} color="inherit" /> : undefined}
                      variant="outlined"
                      color={output2Pending ? 'warning' : (output2State ? 'success' : 'default')}
                      sx={{ fontSize: '0.75rem', height: '20px', minWidth: output2Pending ? '40px' : 'auto' }}
                    />
                  </Box>
                  <Switch
                    checked={output2State}
                    onChange={(e) => handleSwitchChange(2, e.target.checked)}
                    disabled={output2Pending}
                    inputProps={{ 'aria-label': 'Output 2 switch' }}
                    size="small"
                    sx={{
                      // Disable slide animation when pending - snap instantly
                      '& .MuiSwitch-switchBase': {
                        borderRadius: '16px',
                        transition: output2Pending ? 'none' : undefined,
                      },
                      '& .MuiSwitch-thumb': {
                        borderRadius: '16px',
                        transition: output2Pending ? 'none' : undefined,
                        animation: output2Pending ? 'pulse 1s infinite' : 'none',
                      },
                      '& .MuiSwitch-track': {
                        borderRadius: '16px',
                        transition: output2Pending ? 'none' : undefined,
                        animation: output2Pending ? 'pulse 1s infinite' : 'none',
                      },
                      '@keyframes pulse': {
                        '0%, 100%': { opacity: 0.5 },
                        '50%': { opacity: 1 },
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
                disabled={powerSavingPending}
                inputProps={{ 'aria-label': 'Power Saving Mode switch' }}
                size="small"
                sx={{
                  '& .MuiSwitch-switchBase': { borderRadius: '16px' },
                  '& .MuiSwitch-thumb': { 
                    borderRadius: '16px',
                    animation: powerSavingPending ? 'pulse 1s infinite' : 'none',
                  },
                  '& .MuiSwitch-track': { 
                    borderRadius: '16px',
                    animation: powerSavingPending ? 'pulse 1s infinite' : 'none',
                  },
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 0.5 },
                    '50%': { opacity: 1 },
                  },
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

