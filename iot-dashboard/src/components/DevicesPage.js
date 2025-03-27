import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Grid, 
  Typography, 
  Box, 
  Card, 
  CardContent,
  AppBar,
  Toolbar,
  IconButton,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CardActions,
  DialogContentText
} from "@mui/material";
import { 
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import BatteryIndicator from "./BatteryIndicator";
import SignalIndicator from "./SignalIndicator";
import { Helmet } from 'react-helmet';
import SettingsDrawer from "./SettingsDrawer";

const DEVICES_API_URL = "https://1r9r7s5b01.execute-api.eu-central-1.amazonaws.com/default/fetch/devices";
const DEVICE_DATA_API_URL = "https://1r9r7s5b01.execute-api.eu-central-1.amazonaws.com/default/fetch/devices-data";

export default function DevicesPage({ user, onSelectDevice, onLogout }) {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addDeviceOpen, setAddDeviceOpen] = useState(false);
  const [newClientId, setNewClientId] = useState("");
  const [newDeviceName, setNewDeviceName] = useState("");
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState(null);
  const [deviceData, setDeviceData] = useState({});

  useEffect(() => {
    fetchDevices();
  }, [user.email]);

  useEffect(() => {
    devices.forEach(device => {
      fetchDeviceData(device.client_id);
    });
  }, [devices]);

  // Add new useEffect for periodic updates
  useEffect(() => {
    // Initial fetch
    devices.forEach(device => {
      fetchDeviceData(device.client_id);
    });

    // Set up interval to fetch every minute
    const intervalId = setInterval(() => {
      devices.forEach(device => {
        fetchDeviceData(device.client_id);
      });
    }, 60000); // 60000 ms = 1 minute

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, [devices]); // Re-run when devices change

  const fetchDevices = async () => {
    try {
      const response = await fetch(DEVICES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify({
          action: 'get_devices',
          user_email: user.email
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setDevices(data.devices || []);
    } catch (err) {
      console.error('Error fetching devices:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDeviceData = async (deviceId) => {
    try {
      console.log('Fetching data for device:', deviceId);
      const response = await fetch(DEVICE_DATA_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get_device_data',
          client_id: deviceId
        })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch device data');
      }

      // Parse the body if it's a string
      const responseBody = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
      
      // Update the device data in state
      if (responseBody.device_data) {
        setDeviceData(prev => ({
          ...prev,
          [deviceId]: responseBody.device_data
        }));
      }

      return responseBody.device_data;
    } catch (error) {
      console.error('Error fetching device data:', error);
      throw error;
    }
  };

  const handleDeviceClick = (dev) => {
    console.log('Device clicked:', dev);
    // Ensure we have all required device data
    const deviceData = {
      device_id: dev.client_id,
      device_name: dev.device_name || dev.client_id,
      // Add any other required device properties
    };
    console.log('Passing device data to dashboard:', deviceData);
    onSelectDevice(deviceData);
    navigate("/dashboard");
  };

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const handleAddDevice = async () => {
    if (!newClientId.trim() || !newDeviceName.trim()) return;

    try {
      const response = await fetch(DEVICES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify({
          action: 'add_device',
          user_email: user.email,
          client_id: newClientId,
          device_name: newDeviceName
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDevices([...devices, data.device]);
      setNewClientId("");
      setNewDeviceName("");
      setAddDeviceOpen(false);
    } catch (err) {
      console.error('Error adding device:', err);
      setError(err.message);
    }
  };

  const handleDeleteClick = (device) => {
    setDeviceToDelete(device);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deviceToDelete) return;

    try {
      const response = await fetch(DEVICES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify({
          action: 'delete_device',
          user_email: user.email,
          client_id: deviceToDelete.client_id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDevices(devices.filter(device => device.client_id !== deviceToDelete.client_id));
      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
    } catch (err) {
      console.error('Error deleting device:', err);
      setError(err.message);
    }
  };

  const getDeviceStatus = (lastUpdated) => {
    if (!lastUpdated) return 'Inactive';
    const lastUpdateTime = new Date(lastUpdated);
    const now = new Date();
    const diffInMinutes = (now - lastUpdateTime) / (1000 * 60);
    return diffInMinutes <= 1 ? 'Active' : 'Inactive';
  };

  const getStatusColor = (status) => {
    return status === 'Active' ? '#4caf50' : '#f44336';
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            IoT Devices Dashboard
          </Typography>
          <IconButton
            color="inherit"
            onClick={() => setSettingsOpen(true)}
            aria-label="settings"
          >
            <SettingsIcon />
          </IconButton>
          <IconButton
            color="inherit"
            onClick={handleLogout}
            aria-label="logout"
          >
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box p={3}>
        <Helmet>
          <title>Devices | IoT Dashboard</title>
        </Helmet>
        
        <Typography variant="h4" gutterBottom>
          Your Devices
        </Typography>
        
        <Typography variant="subtitle1" gutterBottom>
          User: {user.email}
        </Typography>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <Grid container spacing={3}>
          {/* Existing Devices */}
          {devices.map((device) => {
            const deviceStatus = getDeviceStatus(deviceData[device.client_id]?.last_updated);
            return (
              <Grid item xs={12} sm={6} md={4} key={device.client_id}>
                <Card 
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleDeviceClick(device)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6">
                        {device.device_name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: getStatusColor(deviceStatus),
                            transition: 'background-color 0.3s ease'
                          }}
                        />
                        <Typography variant="caption" sx={{ color: getStatusColor(deviceStatus) }}>
                          {deviceStatus}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography color="textSecondary">
                      Client ID: {device.client_id}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <BatteryIndicator value={deviceData[device.client_id]?.battery_level || 0} />
                      <SignalIndicator value={deviceData[device.client_id]?.signal_strength || 0} />
                    </Box>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Temperature: {deviceData[device.client_id]?.temperature || 0}°C
                    </Typography>
                    <Typography variant="body2">
                      Humidity: {deviceData[device.client_id]?.humidity || 0}%
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Last Updated: {new Date(deviceData[device.client_id]?.last_updated || '').toLocaleString()}
                    </Typography>
                  </CardContent>
                  <CardActions 
                    onClick={(e) => e.stopPropagation()}
                    sx={{ 
                      justifyContent: 'flex-end',
                      padding: '8px 16px',
                      borderTop: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <IconButton 
                      size="small"
                      sx={{ 
                        color: 'text.secondary',
                        '&:hover': {
                          color: 'error.main',
                          backgroundColor: 'error.light',
                        }
                      }}
                      onClick={() => handleDeleteClick(device)}
                      aria-label="delete device"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}

          {/* Add Device Card - Moved to bottom */}
          <Grid item xs={12} sm={6} md={4}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                border: '2px dashed',
                borderColor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '200px',
                '&:hover': {
                  borderColor: 'primary.dark',
                  bgcolor: 'action.hover'
                }
              }}
              onClick={() => setAddDeviceOpen(true)}
            >
              <Box sx={{ textAlign: 'center' }}>
                <AddIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h6" color="primary">
                  Add New Device
                </Typography>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Add Device Dialog */}
      <Dialog open={addDeviceOpen} onClose={() => setAddDeviceOpen(false)}>
        <DialogTitle>Add New Device</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Client ID"
            type="text"
            fullWidth
            value={newClientId}
            onChange={(e) => setNewClientId(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Device Name"
            type="text"
            fullWidth
            value={newDeviceName}
            onChange={(e) => setNewDeviceName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDeviceOpen(false)}>Cancel</Button>
          <Button onClick={handleAddDevice} variant="contained">Add Device</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Device
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete {deviceToDelete?.device_name}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <SettingsDrawer 
        open={settingsOpen} 
        onClose={() => setSettingsOpen(false)}
      />
    </Box>
  );
} 