import React, { useState, useEffect } from 'react';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  CircularProgress,
  Card,
  CardContent,
  Switch,
  Slider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  TextField,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import BluetoothIcon from '@mui/icons-material/Bluetooth';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';

// UUIDs from your ESP32 code
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const RESTART_SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
const LED1_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
const LED2_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a9";
const SPEED_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26aa";
const STATUS_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26ab";
const MODEM_ISSUE_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26ac";
const OFFLINE_MODE_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26ae";
const RESTART_CHAR_UUID = "cafebabe-1234-5678-9abc-def012345678";

interface BluetoothDevice {
  deviceId: string;
  name?: string;
}

interface BluetoothControlProps {
  device?: any;
  onClose?: () => void;
}

const BluetoothControl: React.FC<BluetoothControlProps> = ({ device, onClose }) => {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<BluetoothDevice | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [led1State, setLed1State] = useState<boolean>(false);
  const [led2State, setLed2State] = useState<boolean>(false);
  const [motorSpeed, setMotorSpeed] = useState<number>(0);
  const [speedInput, setSpeedInput] = useState<string>('');
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [diagnosticData, setDiagnosticData] = useState<string>('');
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState<boolean>(false);
  const [isAttemptingReconnect, setIsAttemptingReconnect] = useState<boolean>(false);
  const [offlineMode, setOfflineMode] = useState<boolean>(false);
  const [isLoadingOfflineMode, setIsLoadingOfflineMode] = useState<boolean>(false);

  const showNotification = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info'): void => {
    setToastMessage(message);
    setToastSeverity(severity);
    setShowToast(true);
  };

  const initializeBluetooth = async (): Promise<void> => {
    try {
      console.log('Initializing Bluetooth...');
      
      if (!Capacitor.isNativePlatform()) {
        throw new Error('Bluetooth is only available on native platforms');
      }

      await BleClient.initialize();
      setIsInitialized(true);
      showNotification('Bluetooth initialized successfully', 'success');
      console.log('Bluetooth initialized successfully');
      
      // After initialization, try to reconnect to previously connected device
      await attemptReconnect();
    } catch (error) {
      console.error('Bluetooth initialization error:', error);
      showNotification(`Failed to initialize Bluetooth: ${(error as Error).message}`, 'error');
    }
  };

  const attemptReconnect = async (): Promise<void> => {
    // Check if we have a stored device ID in localStorage
    const storedDeviceId = localStorage.getItem('lastConnectedDeviceId');
    const storedDeviceName = localStorage.getItem('lastConnectedDeviceName');
    
    if (storedDeviceId && storedDeviceName) {
      console.log('Attempting to reconnect to:', storedDeviceName);
      setIsAttemptingReconnect(true);
      
      try {
        // Just attempt to connect directly - don't check if already connected
        console.log('Attempting to connect to stored device...');
        const device = { deviceId: storedDeviceId, name: storedDeviceName };
        await connectToDevice(device);
      } catch (error) {
        console.error('Reconnection failed:', error);
        showNotification('Failed to reconnect to previous device', 'warning');
        // Clear stored device info if reconnection fails
        localStorage.removeItem('lastConnectedDeviceId');
        localStorage.removeItem('lastConnectedDeviceName');
      } finally {
        setIsAttemptingReconnect(false);
      }
    }
  };

  const startScan = async (): Promise<void> => {
    if (!isInitialized) {
      showNotification('Bluetooth not initialized. Please try again.', 'error');
      return;
    }

    try {
      console.log('Starting BLE scan...');
      setIsScanning(true);
      setDevices([]);
      
      await BleClient.requestLEScan(
        { services: [] },
        (result) => {
          console.log('Found device:', result.device);
          if (result.device.name) {
            setDevices(prevDevices => {
              const existing = prevDevices.find(d => d.deviceId === result.device.deviceId);
              if (!existing) {
                console.log('Adding new device:', result.device.name);
                return [...prevDevices, result.device];
              }
              return prevDevices;
            });
          }
        }
      );

      setTimeout(() => {
        console.log('Stopping BLE scan...');
        BleClient.stopLEScan();
        setIsScanning(false);
        if (devices.length === 0) {
          showNotification('No devices found', 'info');
        }
      }, 10000);
    } catch (error) {
      console.error('Scan start error:', error);
      showNotification(`Failed to start scanning: ${(error as Error).message}`, 'error');
      setIsScanning(false);
    }
  };

  const connectToDevice = async (device: BluetoothDevice): Promise<void> => {
    try {
      console.log('Connecting to device:', device.name, 'ID:', device.deviceId);
      
      // Try to connect - this might succeed even if already connected
      await BleClient.connect(device.deviceId);
      console.log('Connection successful');
      
      setSelectedDevice(device);
      setIsConnected(true);
      
      // Store device info for reconnection
      localStorage.setItem('lastConnectedDeviceId', device.deviceId);
      localStorage.setItem('lastConnectedDeviceName', device.name || 'Unknown Device');
      
      showNotification(`Connected to ${device.name || 'Unknown Device'}`, 'success');
      
      // Read current LED states and motor speed
      await readDeviceStates(device.deviceId);
    } catch (error) {
      console.error('Connection error:', error);
      
      // Check if the error is because we're already connected
      if ((error as Error).message && (error as Error).message.includes('already connected')) {
        console.log('Device already connected, updating state...');
        setSelectedDevice(device);
        setIsConnected(true);
        
        // Store device info for reconnection
        localStorage.setItem('lastConnectedDeviceId', device.deviceId);
        localStorage.setItem('lastConnectedDeviceName', device.name || 'Unknown Device');
        
        showNotification(`Reconnected to ${device.name || 'Unknown Device'}`, 'success');
        
        // Read current LED states and motor speed
        await readDeviceStates(device.deviceId);
      } else {
        showNotification('Failed to connect to device', 'error');
        setIsConnected(false);
        setSelectedDevice(null);
        
        // Clear stored device info if connection fails
        localStorage.removeItem('lastConnectedDeviceId');
        localStorage.removeItem('lastConnectedDeviceName');
      }
    }
  };

  const disconnectFromDevice = async (): Promise<void> => {
    if (selectedDevice) {
      try {
        await BleClient.disconnect(selectedDevice.deviceId);
        showNotification('Disconnected from device', 'info');
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    }
    
    setIsConnected(false);
    setSelectedDevice(null);
    setDiagnosticData('');
    
    // Clear stored device info
    localStorage.removeItem('lastConnectedDeviceId');
    localStorage.removeItem('lastConnectedDeviceName');
  };

  const readDeviceStates = async (deviceId: string): Promise<void> => {
    try {
      console.log('Reading device states...');
      
      // Read LED1 state
      const led1Data = await BleClient.read(deviceId, SERVICE_UUID, LED1_CHAR_UUID);
      const led1Value = new TextDecoder().decode(led1Data as any);
      setLed1State(led1Value === '1');
      
      // Read LED2 state
      const led2Data = await BleClient.read(deviceId, SERVICE_UUID, LED2_CHAR_UUID);
      const led2Value = new TextDecoder().decode(led2Data as any);
      setLed2State(led2Value === '1');
      
      // Read motor speed
      const speedData = await BleClient.read(deviceId, SERVICE_UUID, SPEED_CHAR_UUID);
      const speedValue = new TextDecoder().decode(speedData as any);
      setMotorSpeed(parseInt(speedValue) || 0);
      
      // Read offline mode state
      const offlineData = await BleClient.read(deviceId, SERVICE_UUID, OFFLINE_MODE_CHAR_UUID);
      const offlineValue = new TextDecoder().decode(offlineData as any);
      setOfflineMode(offlineValue === '1');
      
      console.log('Device states read successfully');
    } catch (error) {
      console.error('Error reading device states:', error);
      showNotification('Failed to read device states', 'error');
    }
  };

  const readDiagnosticData = async (deviceId: string): Promise<void> => {
    if (!deviceId) return;
    
    setIsLoadingDiagnostics(true);
    try {
      const diagnosticData = await BleClient.read(deviceId, SERVICE_UUID, MODEM_ISSUE_CHAR_UUID);
      const diagnosticText = new TextDecoder().decode(diagnosticData as any);
      setDiagnosticData(diagnosticText);
      console.log('Diagnostic data read:', diagnosticText);
    } catch (error) {
      console.error('Failed to read diagnostic data:', error);
      setDiagnosticData('Failed to read diagnostic data: ' + (error as Error).message);
    } finally {
      setIsLoadingDiagnostics(false);
    }
  };

  const toggleLED1 = async (value: boolean): Promise<void> => {
    if (!selectedDevice) return;
    try {
      await BleClient.write(
        selectedDevice.deviceId,
        SERVICE_UUID,
        LED1_CHAR_UUID,
        new TextEncoder().encode(value ? "1" : "0") as any
      );
      setLed1State(value);
      showNotification(`LED 1 turned ${value ? 'on' : 'off'}`, 'success');
    } catch (error) {
      console.error('LED1 toggle error:', error);
      showNotification('Failed to toggle LED1', 'error');
    }
  };

  const toggleLED2 = async (value: boolean): Promise<void> => {
    if (!selectedDevice) return;
    try {
      await BleClient.write(
        selectedDevice.deviceId,
        SERVICE_UUID,
        LED2_CHAR_UUID,
        new TextEncoder().encode(value ? "1" : "0") as any
      );
      setLed2State(value);
      showNotification(`LED 2 turned ${value ? 'on' : 'off'}`, 'success');
    } catch (error) {
      console.error('LED2 toggle error:', error);
      showNotification('Failed to toggle LED2', 'error');
    }
  };

  const handleSpeedChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const value = event.target.value;
    setSpeedInput(value);
  };

  const handleSpeedSubmit = async (): Promise<void> => {
    if (!selectedDevice || !speedInput) return;
    
    try {
      const speed = parseInt(speedInput);
      if (isNaN(speed) || speed < 0 || speed > 100) {
        showNotification('Speed must be between 0 and 100', 'error');
        return;
      }
      
      const encoder = new TextEncoder();
      await BleClient.write(selectedDevice.deviceId, SERVICE_UUID, SPEED_CHAR_UUID, encoder.encode(speed.toString()) as any);
      
      setMotorSpeed(speed);
      showNotification(`Motor speed set to ${speed}%`, 'success');
    } catch (error) {
      console.error('Error setting motor speed:', error);
      showNotification('Failed to set motor speed', 'error');
    }
  };

  const toggleOfflineMode = async (enabled: boolean): Promise<void> => {
    if (!selectedDevice) return;
    
    try {
      setIsLoadingOfflineMode(true);
      const encoder = new TextEncoder();
      const value = enabled ? '1' : '0';
      
      await BleClient.write(selectedDevice.deviceId, SERVICE_UUID, OFFLINE_MODE_CHAR_UUID, encoder.encode(value) as any);
      
      setOfflineMode(enabled);
      showNotification(`Offline mode ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
      console.error('Error toggling offline mode:', error);
      showNotification('Failed to toggle offline mode', 'error');
    } finally {
      setIsLoadingOfflineMode(false);
    }
  };

  const restartDevice = async (): Promise<void> => {
    if (!selectedDevice) return;
    try {
      console.log('Attempting to restart device...');
      showNotification('Restarting device...', 'info');
      
      console.log('Writing to restart characteristic:', RESTART_CHAR_UUID);
      await BleClient.write(
        selectedDevice.deviceId,
        RESTART_SERVICE_UUID,
        RESTART_CHAR_UUID,
        new Uint8Array([49]) as any // '1' as ASCII
      );
      console.log('Restart command sent successfully');
      
      // Don't wait for confirmation - ESP32 restarts immediately
      showNotification('Device restarting... Please reconnect in a few seconds', 'success');
      
      // Disconnect immediately since device is restarting
      setTimeout(() => {
        disconnectFromDevice();
      }, 1000);
    } catch (error) {
      console.error('Error sending restart command:', error);
      // Even if there's an error, the device might still restart
      showNotification('Restart command sent. Device may be restarting...', 'warning');
      setTimeout(() => {
        disconnectFromDevice();
      }, 1000);
    }
  };

  useEffect(() => {
    initializeBluetooth();
    // Don't disconnect on unmount - we want to preserve the connection
    // return () => {
    //   if (selectedDevice) {
    //     BleClient.disconnect(selectedDevice.deviceId);
    //   }
    // };
  }, []);

  // Auto-read diagnostic data when switching to Diagnostics tab
  useEffect(() => {
    if (activeTab === 1 && selectedDevice && isConnected) {
      readDiagnosticData(selectedDevice.deviceId);
    }
  }, [activeTab, selectedDevice, isConnected]);

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '80vh',
          fontSize: '0.8rem'
        }
      }}
    >
      <DialogTitle sx={{ fontSize: '1rem', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BluetoothIcon sx={{ fontSize: '1.2rem' }} />
          <Typography variant="h6" sx={{ fontSize: '1rem' }}>
            Bluetooth Control
          </Typography>
        </Box>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8, fontSize: '0.8rem' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ fontSize: '0.75rem', p: 2 }}>
        {isAttemptingReconnect ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography variant="body1" sx={{ fontSize: '0.875rem' }}>
              Reconnecting to previous device...
            </Typography>
          </Box>
        ) : !isConnected ? (
          <Box>
            <Button
              variant="contained"
              onClick={startScan}
              disabled={isScanning}
              fullWidth
              sx={{ mb: 2, fontSize: '0.875rem' }}
            >
              {isScanning ? <CircularProgress size={20} /> : 'Scan for Devices'}
            </Button>
            
            {/* Show stored device info and manual reconnect option */}
            {localStorage.getItem('lastConnectedDeviceId') && (
              <Box sx={{ mb: 2, p: 2, border: '1px solid #ccc', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 1 }}>
                  Previously connected device:
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 1 }}>
                  {localStorage.getItem('lastConnectedDeviceName')}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => attemptReconnect()}
                  sx={{ fontSize: '0.75rem' }}
                >
                  Reconnect to Previous Device
                </Button>
              </Box>
            )}
            
            <List>
              {devices.map((device) => (
                <ListItem
                  key={device.deviceId}
                  button
                  onClick={() => connectToDevice(device)}
                  sx={{ py: 1 }}
                >
                  <ListItemText
                    primary={device.name || 'Unknown Device'}
                    secondary={device.deviceId}
                    primaryTypographyProps={{ fontSize: '0.875rem' }}
                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        ) : (
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontSize: '1rem', flex: 1, minWidth: 0 }}>
                  {selectedDevice?.name}
                </Typography>
              </Box>

              <Tabs value={activeTab} onChange={(e: React.SyntheticEvent, newValue: number) => setActiveTab(newValue)} sx={{ mb: 2 }}>
                <Tab label="Commands" sx={{ fontSize: '0.7rem', minHeight: '32px' }} />
                <Tab label="Diagnostics" sx={{ fontSize: '0.7rem', minHeight: '32px' }} />
                <Tab label="Device" sx={{ fontSize: '0.7rem', minHeight: '32px' }} />
              </Tabs>

              {activeTab === 0 && (
                <Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography gutterBottom sx={{ fontSize: '0.75rem' }}>LED 1</Typography>
                    <Switch
                      checked={led1State}
                      onChange={(e) => toggleLED1(e.target.checked)}
                      size="small"
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography gutterBottom sx={{ fontSize: '0.75rem' }}>LED 2</Typography>
                    <Switch
                      checked={led2State}
                      onChange={(e) => toggleLED2(e.target.checked)}
                      size="small"
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography gutterBottom sx={{ fontSize: '0.75rem' }}>Motor Speed: {motorSpeed}%</Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <TextField
                        type="number"
                        value={speedInput}
                        onChange={handleSpeedChange}
                        sx={{ width: '80px', flexShrink: 0 }}
                        size="small"
                        inputProps={{ 
                          min: 0, 
                          max: 100,
                          style: { fontSize: '0.7rem' }
                        }}
                      />
                      <Button
                        variant="contained"
                        onClick={handleSpeedSubmit}
                        disabled={!speedInput || parseInt(speedInput) < 0 || parseInt(speedInput) > 100}
                        sx={{ flexShrink: 0, fontSize: '0.65rem' }}
                        size="small"
                      >
                        Set
                      </Button>
                    </Box>
                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.65rem' }}>
                      Speed range: 0-100%
                    </Typography>
                  </Box>
                </Box>
              )}

              {activeTab === 1 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="h6" sx={{ fontSize: '0.9rem' }}>Device Diagnostics</Typography>
                    <Button
                      variant="contained"
                      startIcon={<RefreshIcon />}
                      onClick={() => selectedDevice && readDiagnosticData(selectedDevice.deviceId)}
                      disabled={isLoadingDiagnostics}
                      sx={{ flexShrink: 0, fontSize: '0.65rem' }}
                      size="small"
                    >
                      {isLoadingDiagnostics ? <CircularProgress size={14} /> : 'Reload'}
                    </Button>
                  </Box>
                  
                  <Paper sx={{ p: 1.5, maxHeight: '400px', overflow: 'auto' }}>
                    {diagnosticData ? (
                      <Typography 
                        component="pre" 
                        sx={{ 
                          fontFamily: 'monospace', 
                          fontSize: '0.65rem',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          lineHeight: 1.3
                        }}
                      >
                        {diagnosticData}
                      </Typography>
                    ) : (
                      <Typography color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                        No diagnostic data available. Click "Reload" to fetch current device status.
                      </Typography>
                    )}
                  </Paper>
                </Box>
              )}

              {activeTab === 2 && (
                <Box>
                  <Typography variant="h6" sx={{ fontSize: '0.9rem', mb: 2 }}>Device Controls</Typography>
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography gutterBottom sx={{ fontSize: '0.75rem', mb: 1 }}>
                      Offline Mode: {offlineMode ? 'Enabled' : 'Disabled'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Switch
                        checked={offlineMode}
                        onChange={(e) => toggleOfflineMode(e.target.checked)}
                        disabled={isLoadingOfflineMode}
                        size="small"
                      />
                      <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                        {isLoadingOfflineMode ? 'Updating...' : (offlineMode ? 'Disable' : 'Enable')}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.65rem' }}>
                      When enabled, disables all SIM7080 operations and powers off the modem
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography gutterBottom sx={{ fontSize: '0.75rem', mb: 1 }}>
                      Device Restart
                    </Typography>
                    <Button
                      variant="contained"
                      color="warning"
                      onClick={restartDevice}
                      fullWidth
                      sx={{ fontSize: '0.7rem' }}
                      size="small"
                    >
                      Restart Device
                    </Button>
                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.65rem' }}>
                      Restarts the ESP32 device. You'll need to reconnect after restart.
                    </Typography>
                  </Box>
                </Box>
              )}

              <Button
                variant="outlined"
                color="error"
                onClick={disconnectFromDevice}
                fullWidth
                sx={{ mt: 2, fontSize: '0.7rem' }}
                size="small"
              >
                Disconnect
              </Button>
            </CardContent>
          </Card>
        )}
      </DialogContent>

      <Snackbar
        open={showToast}
        autoHideDuration={5000}
        onClose={() => setShowToast(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowToast(false)} 
          severity={toastSeverity}
          sx={{ width: '100%', fontSize: '0.875rem' }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default BluetoothControl; 