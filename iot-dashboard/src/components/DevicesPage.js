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
  DialogContentText,
  Paper,
  useTheme,
  Alert,
  Snackbar,
} from "@mui/material";
import { 
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIndicatorIcon
} from '@mui/icons-material';
import BatteryIndicator from "./BatteryIndicator";
import SignalIndicator from "./SignalIndicator";
import { Helmet } from 'react-helmet';
import SettingsDrawer from "./SettingsDrawer";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";

const DEVICES_API_URL = "https://1r9r7s5b01.execute-api.eu-central-1.amazonaws.com/default/fetch/devices";
const DEVICE_DATA_API_URL = "https://1r9r7s5b01.execute-api.eu-central-1.amazonaws.com/default/fetch/devices-data";

export default function DevicesPage({ user, onSelectDevice, onLogout }) {
  const navigate = useNavigate();
  const theme = useTheme();
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
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [newDevice, setNewDevice] = useState({
    device_name: "",
    client_id: "",
    user_email: user.email,
  });
  const [editingDevice, setEditingDevice] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [draggedDevice, setDraggedDevice] = useState(null);

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

  const handleDragStart = (e, device) => {
    setDraggedDevice(device);
    // Add a class to the dragged element
    e.target.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    // Remove the class when dragging ends
    e.target.classList.remove('dragging');
    setDraggedDevice(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetDevice) => {
    e.preventDefault();
    if (!draggedDevice || draggedDevice.client_id === targetDevice.client_id) return;

    const newDevices = [...devices];
    const draggedIndex = newDevices.findIndex(d => d.client_id === draggedDevice.client_id);
    const targetIndex = newDevices.findIndex(d => d.client_id === targetDevice.client_id);

    // Remove dragged device and insert at new position
    newDevices.splice(draggedIndex, 1);
    newDevices.splice(targetIndex, 0, draggedDevice);

    setDevices(newDevices);
    setDraggedDevice(null);
  };

  const handleEditClick = (device) => {
    setEditingDevice(device);
    setNewDevice({
      device_name: device.device_name,
      client_id: device.client_id,
      user_email: user.email,
    });
    setOpenEditDialog(true);
  };

  const handleEditConfirm = async () => {
    if (!editingDevice || !newDevice.device_name.trim()) return;

    try {
      const response = await fetch(DEVICES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify({
          action: 'update_device',
          user_email: user.email,
          old_client_id: editingDevice.client_id,
          new_client_id: newDevice.client_id,
          device_name: newDevice.device_name
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDevices(devices.map(device => 
        device.client_id === editingDevice.client_id ? data.device : device
      ));
      setOpenEditDialog(false);
      setEditingDevice(null);
      setNewDevice({
        device_name: "",
        client_id: "",
        user_email: user.email,
      });
      showSnackbar('Device updated successfully', 'success');
    } catch (err) {
      console.error('Error updating device:', err);
      showSnackbar(err.message, 'error');
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <>
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
          {devices.map((device) => {
            const deviceStatus = getDeviceStatus(deviceData[device.client_id]?.last_updated);
            return (
              <Grid item xs={12} sm={6} md={4} key={device.client_id}>
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: theme.palette.background.paper,
                    cursor: 'grab',
                    transition: 'transform 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6,
                    },
                    '&.dragging': {
                      cursor: 'grabbing',
                      transform: 'scale(1.02)',
                      boxShadow: 'none',
                      opacity: 0.8,
                    },
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      backgroundColor: getStatusColor(deviceStatus),
                      transition: 'background-color 0.3s ease',
                    }
                  }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, device)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, device)}
                  onClick={() => handleDeviceClick(device)}
                >
                  {/* Drag Handle */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      color: theme.palette.text.secondary,
                      '&:hover': {
                        color: theme.palette.primary.main,
                      },
                      cursor: 'grab',
                      '&:active': {
                        cursor: 'grabbing',
                      },
                    }}
                  >
                    <DragIndicatorIcon />
                  </Box>

                  {/* Device Info */}
                  <Box sx={{ flexGrow: 1 }}>
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
                    <Typography variant="body2" color="textSecondary">
                      ID: {device.client_id}
                    </Typography>
                  </Box>

                  {/* Device Data */}
                  <Box sx={{ mt: 1, display: 'flex', gap: 2 }}>
                    <BatteryIndicator value={deviceData[device.client_id]?.battery_level || 0} />
                    <SignalIndicator value={deviceData[device.client_id]?.signal_strength || 0} />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                    <Typography variant="body2">
                      Temp: {deviceData[device.client_id]?.temperature || 0}°C
                    </Typography>
                    <Typography variant="body2">
                      Hum: {deviceData[device.client_id]?.humidity || 0}%
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Last Updated: {new Date(deviceData[device.client_id]?.last_updated || '').toLocaleString()}
                  </Typography>

                  {/* Action Buttons */}
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      gap: 1, 
                      mt: 1,
                      pt: 1,
                      borderTop: '1px solid',
                      borderColor: 'divider',
                      justifyContent: 'flex-end'
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(device);
                      }}
                    >
                      <FaEdit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(device);
                      }}
                    >
                      <FaTrash />
                    </IconButton>
                  </Box>
                </Paper>
              </Grid>
            );
          })}

          {/* Add Device Card */}
          <Grid item xs={12} sm={6} md={4}>
            <Paper
              sx={{
                p: 2,
                bgcolor: theme.palette.background.paper,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '300px',
                border: '2px dashed',
                borderColor: 'primary.main',
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
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Click to register a new device
                </Typography>
              </Box>
            </Paper>
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

      {/* Edit Device Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
        <DialogTitle>Edit Device</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Client ID"
            type="text"
            fullWidth
            value={newDevice.client_id}
            onChange={(e) => setNewDevice({ ...newDevice, client_id: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Device Name"
            type="text"
            fullWidth
            value={newDevice.device_name}
            onChange={(e) => setNewDevice({ ...newDevice, device_name: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button onClick={handleEditConfirm} variant="contained">Save Changes</Button>
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

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
} 