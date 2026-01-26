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
  DialogActions,
  Slider
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

  // Coercion helpers (shadow values can arrive as number | string | boolean depending on source)
  const toBool01 = (v: any) => v === 1 || v === '1' || v === true;
  const toNum = (v: any, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  // Desired states (what we want - controlled by switches/inputs)
  const [output1Desired, setOutput1Desired] = useState(false);
  const [output2Desired, setOutput2Desired] = useState(false);
  const [motorSpeedDesired, setMotorSpeedDesired] = useState('');
  const [powerSavingDesired, setPowerSavingDesired] = useState(false);
  
  // Reported states (actual device state - from shadow)
  const [output1Reported, setOutput1Reported] = useState(false);
  const [output2Reported, setOutput2Reported] = useState(false);
  const [motorSpeedReported, setMotorSpeedReported] = useState('');
  const [powerSavingReported, setPowerSavingReported] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  // @ts-ignore
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Track if we've initialized desired state from deviceState (only once on mount)
  const initializedDesiredRef = useRef(false);
  const [commandFeedback, setCommandFeedback] = useState({
    show: false,
    message: '',
    loading: false
  });
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);

  // IMPORTANT:
  // Only ONE component should own the WebSocket connection for device shadow updates.
  // `Dashboard.tsx` is the single owner and passes `deviceState` down.
  // This prevents duplicated/out-of-order updates from multiple sockets.

  // Fetch device state from Device Shadow (source of truth - no fallback)
  const fetchDeviceStateFromShadow = useCallback(async () => {
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
        // Include both reported and desired state
        const desired = result.state.desired || {};
        return {
          client_id: result.state.client_id,
          timestamp: result.state.timestamp,
          // Reported state (actual device state)
          out1_state: result.state.out1_state,
          out2_state: result.state.out2_state,
          motor_speed: result.state.motor_speed,
          power_saving: result.state.power_saving,
          in1_state: result.state.in1_state,
          in2_state: result.state.in2_state,
          charging: result.state.charging,
          connection_status: result.state.connection_status,
          // Desired state (what we want - persists in shadow)
          // Lambda returns desired state with keys: out1_state, out2_state, motor_speed, power_saving
          desired: desired
        };
      }
      
      console.warn('⚠️ Shadow response did not contain state');
      return null;
    } catch (error: any) {
      console.error('❌ Error fetching device state from Shadow:', error);
      setError(error.message || 'Failed to fetch device state from Shadow');
      return null;
    }
  }, [device]);

  // Fetch shadow state ONCE on mount (for initial state only)
  // After that, WebSocket is the primary source of truth for reported state
  useEffect(() => {
    const fetchInitialState = async () => {
      if (!device?.client_id || initializedDesiredRef.current) return;
      
      try {
        console.log('📥 Fetching initial state from shadow (one-time on mount)...');
        const shadowState = await fetchDeviceStateFromShadow();
        if (shadowState) {
          console.log('🔍 Initializing state from shadow:', {
            out1_state: shadowState.out1_state,
            out2_state: shadowState.out2_state,
            power_saving: shadowState.power_saving,
            motor_speed: shadowState.motor_speed
          });
          
          // Initialize reported state from shadow (one-time)
          const out1 = toBool01(shadowState.out1_state);
          const out2 = toBool01(shadowState.out2_state);
          const powerSaving = toBool01(shadowState.power_saving);
          const motorSpeed = toNum(shadowState.motor_speed, 0).toString();
          
          setOutput1Reported(out1);
          setOutput2Reported(out2);
          setPowerSavingReported(powerSaving);
          setMotorSpeedReported(motorSpeed);
          
          console.log('✅ Reported state initialized from shadow:', { out1, out2, powerSaving, motorSpeed });
          
          // Initialize desired state from shadow (persisted state) - only once
          if (shadowState.desired) {
            const desired = shadowState.desired;
            if (desired.out1_state !== undefined && desired.out1_state !== null) {
              setOutput1Desired(toBool01(desired.out1_state));
            }
            if (desired.out2_state !== undefined && desired.out2_state !== null) {
              setOutput2Desired(toBool01(desired.out2_state));
            }
            if (desired.power_saving !== undefined && desired.power_saving !== null) {
              setPowerSavingDesired(toBool01(desired.power_saving));
            }
            if (desired.motor_speed !== undefined && desired.motor_speed !== null) {
              setMotorSpeedDesired(toNum(desired.motor_speed, 0).toString());
            }
          } else {
            // Fallback: if no desired state in shadow, use reported state
            setOutput1Desired(toBool01(shadowState.out1_state));
            setOutput2Desired(toBool01(shadowState.out2_state));
            setPowerSavingDesired(toBool01(shadowState.power_saving));
            setMotorSpeedDesired(toNum(shadowState.motor_speed, 0).toString());
          }
          
          initializedDesiredRef.current = true;
          console.log('✅ Initial state loaded from shadow - WebSocket will handle all future updates');
        } else {
          console.warn('⚠️ Shadow state fetch returned null');
        }
      } catch (error) {
        console.error('❌ Error fetching initial shadow state:', error);
      }
    };
    
    // Fetch ONLY once on mount
    fetchInitialState();
  }, [device?.client_id, fetchDeviceStateFromShadow]);

  // Debug: Log current reported state values
  useEffect(() => {
    console.log('🔍 Current reported state values:', {
      output1Reported,
      output2Reported,
      powerSavingReported,
      motorSpeedReported
    });
  }, [output1Reported, output2Reported, powerSavingReported, motorSpeedReported]);

  // Update reported state from deviceState prop (from parent component)
  // Only update if values actually changed to prevent unnecessary re-renders
  useEffect(() => {
    if (deviceState) {
      console.log('🔍 deviceState prop received:', {
        out1_state: deviceState.out1_state,
        out2_state: deviceState.out2_state,
        power_saving: deviceState.power_saving,
        motor_speed: deviceState.motor_speed
      });
      const out1 = toBool01(deviceState.out1_state);
      const out2 = toBool01(deviceState.out2_state);
      const powerSaving = toBool01(deviceState.power_saving);
      const motorSpeed = toNum(deviceState.motor_speed, 0).toString();
      
      // Only update reported state if values actually changed (prevents unnecessary re-renders)
      setOutput1Reported(prev => {
        if (prev !== out1) {
          console.log(`🔄 OUT1 reported state changed from prop: ${prev} → ${out1}`);
          return out1;
        }
        return prev;
      });
      
      setOutput2Reported(prev => {
        if (prev !== out2) {
          console.log(`🔄 OUT2 reported state changed from prop: ${prev} → ${out2}`);
          return out2;
        }
        return prev;
      });
      
      setPowerSavingReported(prev => {
        if (prev !== powerSaving) {
          console.log(`🔄 Power saving reported state changed from prop: ${prev} → ${powerSaving}`);
          return powerSaving;
        }
        return prev;
      });
      
      setMotorSpeedReported(prev => {
        if (prev !== motorSpeed) {
          console.log(`🔄 Motor speed reported state changed from prop: ${prev} → ${motorSpeed}`);
          return motorSpeed;
        }
        return prev;
      });

      // If we got a fresh state update from the parent, stop "verifying" UX.
      setIsVerifying(false);
      setCommandFeedback(prev => (prev.show ? { show: false, message: '', loading: false } : prev));
      
      // Do NOT update desired state from deviceState - it's only controlled by user input
      // Desired state is initialized from shadow on mount and persists there
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
        desiredState = { o1: 1 };
      } else if (command === "TOGGLE_1_OFF") {
        desiredState = { o1: 0 };
      } else if (command === "TOGGLE_2_ON") {
        desiredState = { o2: 1 };
      } else if (command === "TOGGLE_2_OFF") {
        desiredState = { o2: 0 };
      } else if (command === "SET_SPEED") {
        const speed = (params as any).speed || parseInt(motorSpeedDesired);
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
    // Update desired state immediately (what user wants)
    if (led === 1) {
      setOutput1Desired(isOn);
    } else {
      setOutput2Desired(isOn);
    }
    
    try {
      const command = isOn ? `TOGGLE_${led}_ON` : `TOGGLE_${led}_OFF`;
      await sendCommand(command);
      console.log('📡 Command sent - reported state will update via WebSocket');
    } catch (error: any) {
      console.error('Error in handleSwitchChange:', error);
      setSnackbar({
        open: true,
        message: error.message || t('commands.failedUpdateSwitch'),
        severity: 'error'
      });
    }
  };

  const handlePowerSavingChange = async (isOn: boolean) => {
    // Update desired state immediately (what user wants)
    setPowerSavingDesired(isOn);
    
    try {
      const command = isOn ? 'POWER_SAVING_ON' : 'POWER_SAVING_OFF';
      await sendCommand(command);
      console.log('📡 Power saving command sent - reported state will update via WebSocket');
    } catch (error: any) {
      console.error('Error in handlePowerSavingChange:', error);
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

      const speed = parseInt(motorSpeedDesired);
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
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'rgba(0,0,0,0.02)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', minWidth: '70px' }}>
                      {t('commands.output1')}
                    </Typography>
                    {/* Reported state LED indicator (actual device state) */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                        Reported:
                      </Typography>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: output1Reported ? '#4caf50' : '#9e9e9e',
                          boxShadow: output1Reported 
                            ? '0 0 8px rgba(76, 175, 80, 0.6)' 
                            : 'none',
                          transition: 'all 0.3s ease',
                        }}
                        title={`OUT1 Reported: ${output1Reported ? 'ON' : 'OFF'}`}
                    />
                  </Box>
                  </Box>
                  {/* Switch controls desired state */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                      Desired:
                    </Typography>
                  <Switch
                      checked={output1Desired}
                    onChange={(e) => handleSwitchChange(1, e.target.checked)}
                      inputProps={{ 'aria-label': 'Output 1 switch (desired state)' }}
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

                {/* Output 2 */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'rgba(0,0,0,0.02)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', minWidth: '70px' }}>
                      {t('commands.output2')}
                    </Typography>
                    {/* Reported state LED indicator (actual device state) */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                        Reported:
                      </Typography>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: output2Reported ? '#4caf50' : '#9e9e9e',
                          boxShadow: output2Reported 
                            ? '0 0 8px rgba(76, 175, 80, 0.6)' 
                            : 'none',
                          transition: 'all 0.3s ease',
                        }}
                        title={`OUT2 Reported: ${output2Reported ? 'ON' : 'OFF'}`}
                    />
                  </Box>
                  </Box>
                  {/* Switch controls desired state */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                      Desired:
                    </Typography>
                  <Switch
                      checked={output2Desired}
                    onChange={(e) => handleSwitchChange(2, e.target.checked)}
                      inputProps={{ 'aria-label': 'Output 2 switch (desired state)' }}
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

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Reported state indicator */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', minWidth: '70px' }}>
                    Reported:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', minWidth: '30px' }}>
                    {motorSpeedReported || '0'}
                  </Typography>
                </Box>
                
                {/* Desired state slider */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                      Desired:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', minWidth: '30px', textAlign: 'right' }}>
                      {motorSpeedDesired || '0'}
                    </Typography>
                  </Box>
                  <Slider
                    value={parseInt(motorSpeedDesired) || 0}
                    onChange={(_, value) => setMotorSpeedDesired(value.toString())}
                    onChangeCommitted={async (_, value) => {
                      const speed = value as number;
                      // Desired state already updated by onChange
                      
                      try {
                        await sendCommand('SET_SPEED', { speed });
                        console.log('📡 Motor speed command sent - reported state will update via WebSocket');
                      } catch (error: any) {
                        console.error('Error setting motor speed:', error);
                        setSnackbar({
                          open: true,
                          message: error.message || t('commands.failedUpdateSpeed'),
                          severity: 'error'
                        });
                      }
                    }}
                    min={0}
                    max={100}
                    step={1}
                  sx={{
                      color: 'primary.main',
                      '& .MuiSlider-thumb': {
                        width: 18,
                        height: 18,
                    },
                      '& .MuiSlider-track': {
                        height: 4,
                    },
                      '& .MuiSlider-rail': {
                        height: 4,
                        opacity: 0.3,
                      },
                    }}
                  />
              </Box>
              </Box>
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
              p: 1.5,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'rgba(0,0,0,0.02)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', minWidth: '70px' }}>
                  {t('commands.powerSaving')}
                </Typography>
                {/* Reported state LED indicator (actual device state) */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                    Reported:
                  </Typography>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: powerSavingReported ? '#4caf50' : '#9e9e9e',
                      boxShadow: powerSavingReported 
                        ? '0 0 8px rgba(76, 175, 80, 0.6)' 
                        : 'none',
                      transition: 'all 0.3s ease',
                    }}
                />
              </Box>
              </Box>
              {/* Switch controls desired state */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                  Desired:
                </Typography>
              <Switch
                  checked={powerSavingDesired}
                onChange={(e) => handlePowerSavingChange(e.target.checked)}
                  inputProps={{ 'aria-label': 'Power Saving Mode switch (desired state)' }}
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

