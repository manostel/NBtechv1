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
const LED1_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
const LED2_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a9";
const SPEED_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26aa";
const STATUS_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26ab";
const MODEM_ISSUE_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26ac";

const BluetoothControl = ({ device, onClose }) => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [led1State, setLed1State] = useState(false);
  const [led2State, setLed2State] = useState(false);
  const [motorSpeed, setMotorSpeed] = useState(0);
  const [speedInput, setSpeedInput] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState('info');
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [diagnosticData, setDiagnosticData] = useState('');
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);
  const [isAttemptingReconnect, setIsAttemptingReconnect] = useState(false);

  const showNotification = (message, severity = 'info') => {
    setToastMessage(message);
    setToastSeverity(severity);
    setShowToast(true);
  };

  const initializeBluetooth = async () => {
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
      showNotification(`Failed to initialize Bluetooth: ${error.message}`, 'error');
    }
  };

  const attemptReconnect = async () => {
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

  const startScan = async () => {
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
      showNotification(`Failed to start scanning: ${error.message}`, 'error');
      setIsScanning(false);
    }
  };

  const connectToDevice = async (device) => {
    try {
      console.log('Connecting to device:', device.name, 'ID:', device.deviceId);
      
      // Try to connect - this might succeed even if already connected
      await BleClient.connect(device.deviceId);
      console.log('Connection successful');
      
      setSelectedDevice(device);
      setIsConnected(true);
      
      // Store device info for reconnection
      localStorage.setItem('lastConnectedDeviceId', device.deviceId);
      localStorage.setItem('lastConnectedDeviceName', device.name);
      
      showNotification(`Connected to ${device.name}`, 'success');
      
      // Read current LED states and motor speed
      await readDeviceStates(device.deviceId);
    } catch (error) {
      console.error('Connection error:', error);
      
      // Check if the error is because we're already connected
      if (error.message && error.message.includes('already connected')) {
        console.log('Device already connected, updating state...');
        setSelectedDevice(device);
        setIsConnected(true);
        
        // Store device info for reconnection
        localStorage.setItem('lastConnectedDeviceId', device.deviceId);
        localStorage.setItem('lastConnectedDeviceName', device.name);
        
        showNotification(`Reconnected to ${device.name}`, 'success');
        
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

  const disconnectFromDevice = async () => {
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

  const readDeviceStates = async (deviceId) => {
    try {
      // Read LED1 state
      const led1Data = await BleClient.read(deviceId, SERVICE_UUID, LED1_CHAR_UUID);
      const led1Value = new TextDecoder().decode(led1Data);
      setLed1State(led1Value === "1");
      
      // Read LED2 state
      const led2Data = await BleClient.read(deviceId, SERVICE_UUID, LED2_CHAR_UUID);
      const led2Value = new TextDecoder().decode(led2Data);
      setLed2State(led2Value === "1");
      
      // Read motor speed
      const speedData = await BleClient.read(deviceId, SERVICE_UUID, SPEED_CHAR_UUID);
      const speedValue = new TextDecoder().decode(speedData);
      const speed = parseInt(speedValue, 10);
      if (!isNaN(speed)) {
        setMotorSpeed(speed);
        setSpeedInput(speed.toString());
      }
      
      // Read diagnostic data
      await readDiagnosticData(deviceId);
      
      console.log('Device states read:', { led1: led1Value, led2: led2Value, speed: speedValue });
    } catch (error) {
      console.error('Failed to read device states:', error);
      // Don't show error notification as this is not critical
    }
  };

  const readDiagnosticData = async (deviceId) => {
    if (!deviceId) return;
    
    setIsLoadingDiagnostics(true);
    try {
      const diagnosticData = await BleClient.read(deviceId, SERVICE_UUID, MODEM_ISSUE_CHAR_UUID);
      const diagnosticText = new TextDecoder().decode(diagnosticData);
      setDiagnosticData(diagnosticText);
      console.log('Diagnostic data read:', diagnosticText);
    } catch (error) {
      console.error('Failed to read diagnostic data:', error);
      setDiagnosticData('Failed to read diagnostic data: ' + error.message);
    } finally {
      setIsLoadingDiagnostics(false);
    }
  };

  const toggleLED1 = async (value) => {
    if (!selectedDevice) return;
    try {
      await BleClient.write(
        selectedDevice.deviceId,
        SERVICE_UUID,
        LED1_CHAR_UUID,
        new TextEncoder().encode(value ? "1" : "0")
      );
      setLed1State(value);
      showNotification(`LED 1 turned ${value ? 'on' : 'off'}`, 'success');
    } catch (error) {
      console.error('LED1 toggle error:', error);
      showNotification('Failed to toggle LED1', 'error');
    }
  };

  const toggleLED2 = async (value) => {
    if (!selectedDevice) return;
    try {
      await BleClient.write(
        selectedDevice.deviceId,
        SERVICE_UUID,
        LED2_CHAR_UUID,
        new TextEncoder().encode(value ? "1" : "0")
      );
      setLed2State(value);
      showNotification(`LED 2 turned ${value ? 'on' : 'off'}`, 'success');
    } catch (error) {
      console.error('LED2 toggle error:', error);
      showNotification('Failed to toggle LED2', 'error');
    }
  };

  const handleSpeedChange = (event) => {
    const value = event.target.value;
    setSpeedInput(value);
  };

  const handleSpeedSubmit = async () => {
    if (!selectedDevice) return;
    
    const speed = parseInt(speedInput, 10);
    if (isNaN(speed) || speed < 0 || speed > 100) {
      showNotification('Speed must be between 0 and 100', 'error');
      return;
    }

    try {
      await BleClient.write(
        selectedDevice.deviceId,
        SERVICE_UUID,
        SPEED_CHAR_UUID,
        new TextEncoder().encode(speed.toString())
      );
      setMotorSpeed(speed);
      showNotification(`Speed set to ${speed}%`, 'success');
    } catch (error) {
      showNotification('Failed to set speed', 'error');
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
    <Dialog open={true} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Typography variant="h5" sx={{ fontSize: '1.2rem' }}>
          Bluetooth Control
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ fontSize: '0.875rem' }}>
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

              <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
                <Tab label="Commands" sx={{ fontSize: '0.875rem' }} />
                <Tab label="Diagnostics" sx={{ fontSize: '0.875rem' }} />
              </Tabs>

              {activeTab === 0 && (
                <Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography gutterBottom sx={{ fontSize: '0.875rem' }}>LED 1</Typography>
                    <Switch
                      checked={led1State}
                      onChange={(e) => toggleLED1(e.target.checked)}
                      size="small"
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography gutterBottom sx={{ fontSize: '0.875rem' }}>LED 2</Typography>
                    <Switch
                      checked={led2State}
                      onChange={(e) => toggleLED2(e.target.checked)}
                      size="small"
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography gutterBottom sx={{ fontSize: '0.875rem' }}>Motor Speed: {motorSpeed}%</Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <TextField
                        type="number"
                        value={speedInput}
                        onChange={handleSpeedChange}
                        inputProps={{ min: 0, max: 100 }}
                        sx={{ width: '100px', flexShrink: 0 }}
                        size="small"
                      />
                      <Button
                        variant="contained"
                        onClick={handleSpeedSubmit}
                        disabled={!speedInput || speedInput < 0 || speedInput > 100}
                        sx={{ flexShrink: 0, fontSize: '0.75rem' }}
                        size="small"
                      >
                        Set Speed
                      </Button>
                    </Box>
                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                      Speed range: 0-100%
                    </Typography>
                  </Box>
                </Box>
              )}

              {activeTab === 1 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="h6" sx={{ fontSize: '1rem' }}>Device Diagnostics</Typography>
                    <Button
                      variant="contained"
                      startIcon={<RefreshIcon />}
                      onClick={() => readDiagnosticData(selectedDevice.deviceId)}
                      disabled={isLoadingDiagnostics}
                      sx={{ flexShrink: 0, fontSize: '0.75rem' }}
                      size="small"
                    >
                      {isLoadingDiagnostics ? <CircularProgress size={16} /> : 'Reload'}
                    </Button>
                  </Box>
                  
                  <Paper sx={{ p: 2, maxHeight: '500px', overflow: 'auto' }}>
                    {diagnosticData ? (
                      <Typography 
                        component="pre" 
                        sx={{ 
                          fontFamily: 'monospace', 
                          fontSize: '0.75rem',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          lineHeight: 1.4
                        }}
                      >
                        {diagnosticData}
                      </Typography>
                    ) : (
                      <Typography color="textSecondary" sx={{ fontSize: '0.8rem' }}>
                        No diagnostic data available. Click "Reload" to fetch current device status.
                      </Typography>
                    )}
                  </Paper>
                </Box>
              )}

              <Button
                variant="outlined"
                color="error"
                onClick={disconnectFromDevice}
                fullWidth
                sx={{ mt: 2, fontSize: '0.875rem' }}
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