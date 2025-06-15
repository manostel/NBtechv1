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
  TextField
} from '@mui/material';
import BluetoothIcon from '@mui/icons-material/Bluetooth';
import CloseIcon from '@mui/icons-material/Close';

// UUIDs from your ESP32 code
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const LED1_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
const LED2_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a9";
const SPEED_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26aa";
const STATUS_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26ab";

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
    } catch (error) {
      console.error('Bluetooth initialization error:', error);
      showNotification(`Failed to initialize Bluetooth: ${error.message}`, 'error');
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
      await BleClient.connect(device.deviceId);
      setSelectedDevice(device);
      setIsConnected(true);
      showNotification(`Connected to ${device.name}`, 'success');
    } catch (error) {
      showNotification('Failed to connect to device', 'error');
      setIsConnected(false);
      setSelectedDevice(null);
    }
  };

  const toggleLED1 = async (value) => {
    if (!selectedDevice) return;
    try {
      await BleClient.write(
        selectedDevice.deviceId,
        SERVICE_UUID,
        LED1_CHAR_UUID,
        new Uint8Array([value ? 1 : 0])
      );
      setLed1State(value);
      showNotification(`LED 1 turned ${value ? 'on' : 'off'}`, 'success');
    } catch (error) {
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
        new Uint8Array([value ? 1 : 0])
      );
      setLed2State(value);
      showNotification(`LED 2 turned ${value ? 'on' : 'off'}`, 'success');
    } catch (error) {
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
    return () => {
      if (selectedDevice) {
        BleClient.disconnect(selectedDevice.deviceId);
      }
    };
  }, []);

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Bluetooth Control
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {!isConnected ? (
          <Box>
            <Button
              variant="contained"
              onClick={startScan}
              disabled={isScanning}
              fullWidth
              sx={{ mb: 2 }}
            >
              {isScanning ? <CircularProgress size={24} /> : 'Scan for Devices'}
            </Button>
            <List>
              {devices.map((device) => (
                <ListItem
                  key={device.deviceId}
                  button
                  onClick={() => connectToDevice(device)}
                >
                  <ListItemText
                    primary={device.name || 'Unknown Device'}
                    secondary={device.deviceId}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        ) : (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {selectedDevice?.name}
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography gutterBottom>LED 1</Typography>
                <Switch
                  checked={led1State}
                  onChange={(e) => toggleLED1(e.target.checked)}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography gutterBottom>LED 2</Typography>
                <Switch
                  checked={led2State}
                  onChange={(e) => toggleLED2(e.target.checked)}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography gutterBottom>Motor Speed</Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    type="number"
                    value={speedInput}
                    onChange={handleSpeedChange}
                    inputProps={{ min: 0, max: 100 }}
                    sx={{ width: '100px' }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleSpeedSubmit}
                    disabled={!speedInput || speedInput < 0 || speedInput > 100}
                  >
                    Set Speed
                  </Button>
                </Box>
                <Typography variant="caption" color="textSecondary">
                  Speed range: 0-100%
                </Typography>
              </Box>

              <Button
                variant="outlined"
                color="error"
                onClick={() => {
                  BleClient.disconnect(selectedDevice.deviceId);
                  setIsConnected(false);
                  setSelectedDevice(null);
                }}
                fullWidth
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
          sx={{ width: '100%' }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default BluetoothControl; 