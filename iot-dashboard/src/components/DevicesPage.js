import React, { useState, useEffect, useMemo } from "react";
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
  CssBaseline,
  Skeleton,
  CircularProgress,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Collapse,
  Tooltip,
} from "@mui/material";
import { 
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIndicatorIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import BatteryIndicator from "./BatteryIndicator";
import SignalIndicator from "./SignalIndicator";
import { Helmet } from 'react-helmet';
import SettingsDrawer from "./SettingsDrawer";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { useCustomTheme } from "./ThemeContext";

const DEVICES_API_URL = "https://1r9r7s5b01.execute-api.eu-central-1.amazonaws.com/default/fetch/devices";
const DEVICE_DATA_API_URL = "https://1r9r7s5b01.execute-api.eu-central-1.amazonaws.com/default/fetch/devices-data";
const DEVICE_PREFERENCES_API_URL = "https://1r9r7s5b01.execute-api.eu-central-1.amazonaws.com/default/fetch/devices-preferences";

const DeviceSkeleton = () => (
  <Paper sx={{ p: 2, height: '100%' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
      <Skeleton variant="circular" width={24} height={24} sx={{ mr: 1 }} />
      <Skeleton variant="text" width="60%" height={24} />
    </Box>
    <Skeleton variant="text" width="40%" height={20} sx={{ mb: 2 }} />
    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
      <Skeleton variant="rectangular" width={60} height={20} />
      <Skeleton variant="rectangular" width={60} height={20} />
    </Box>
    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
      <Skeleton variant="text" width="30%" height={20} />
      <Skeleton variant="text" width="30%" height={20} />
    </Box>
    <Skeleton variant="text" width="70%" height={20} />
  </Paper>
);

const EditDeviceDialog = ({ device, onClose }) => {
    const [editedDevice, setEditedDevice] = useState({
        ...device,
        metrics_visibility: device.metrics_visibility || {
            temperature: true,
            humidity: true,
            created_at: false,
            last_seen: true,
            status: true
        }
    });

    // ... rest of the dialog code ...
};

const saveDeviceOrder = (devices, userEmail) => {
  localStorage.setItem(`deviceOrder_${userEmail}`, JSON.stringify(devices));
};

export default function DevicesPage({ user, onSelectDevice, onLogout }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const { currentTheme, setTheme } = useCustomTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addDeviceOpen, setAddDeviceOpen] = useState(false);
  const [newClientId, setNewClientId] = useState("");
  const [newDeviceName, setNewDeviceName] = useState("");
  const [showId, setShowId] = useState({});
  const [devices, setDevices] = useState(() => {
    const savedOrder = localStorage.getItem(`deviceOrder_${user.email}`);
    return savedOrder ? JSON.parse(savedOrder) : [];
  });
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
  const [editDeviceName, setEditDeviceName] = useState("");
  const [deviceMetrics, setDeviceMetrics] = useState({});
  const [editClientId, setEditClientId] = useState("");
  const [clientIdWarningOpen, setClientIdWarningOpen] = useState(false);
  const [pendingEditData, setPendingEditData] = useState(null);
  const [tempMetricsVisibility, setTempMetricsVisibility] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [openClientIdConfirmDialog, setOpenClientIdConfirmDialog] = useState(false);

  useEffect(() => {
    fetchDevices();

    // Set up polling to fetch devices every 55 seconds
    const intervalId = setInterval(() => {
      fetchDevices();
    }, 55000); // 55000 ms = 55 seconds

    return () => clearInterval(intervalId); // Clear interval on unmount
  }, [user.email]);

  const fetchDeviceData = async (device) => {
    try {
      const dataResponse = await fetch(DEVICE_DATA_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'get_device_data',
          client_id: device.client_id,
          user_email: user.email
        })
      });

      if (!dataResponse.ok) {
        throw new Error(`Failed to fetch device data: ${dataResponse.statusText}`);
      }

      const dataResult = await dataResponse.json();
      const deviceData = JSON.parse(dataResult.body).device_data;

      return {
        ...device,
        ...deviceData,
      };

    } catch (error) {
      console.error(`Error fetching data for device ${device.client_id}:`, error);
      return {
        ...device,
      };
    }
  };

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
          action: "get_devices",
          user_email: user.email
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const fetchedDevices = data.devices || [];

      // Sort devices by display_order and update if needed
      const sortedDevices = [...fetchedDevices].sort((a, b) => 
        (a.display_order || 0) - (b.display_order || 0)
      );

      // Ensure each device has a valid display_order
      const devicesWithOrder = sortedDevices.map((device, index) => ({
        ...device,
        display_order: index
      }));

      setDevices(devicesWithOrder);
      saveDeviceOrder(devicesWithOrder, user.email);

      // Fetch preferences for each device after successfully fetching devices
      const updatedDeviceData = {};
      for (const device of devicesWithOrder) {
        const updatedDevice = await fetchDeviceData(device);
        updatedDeviceData[device.client_id] = updatedDevice;

        // Fetch preferences for the specific device
        const preferencesResponse = await fetch(DEVICE_PREFERENCES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            action: 'get_device_preferences',
            user_email: user.email,
            client_id: device.client_id // Include client_id to fetch specific preferences
        })
      });

        if (preferencesResponse.ok) {
          const preferencesData = await preferencesResponse.json();
          const preferences = preferencesData.preferences;

          // Apply preferences to the updated device data
          if (preferences) {
            updatedDeviceData[device.client_id].metrics_visibility = preferences.metrics_visibility;
          }
        }
      }
      setDeviceData(updatedDeviceData); // Update state with preferences applied

    } catch (err) {
      console.error('Error fetching devices:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
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
      const newDevices = [...devices, data.device];
      setDevices(newDevices);
      saveDeviceOrder(newDevices, user.email);
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

        // Update local state
        const newDevices = devices.filter(device => device.client_id !== deviceToDelete.client_id);
        setDevices(newDevices);
        saveDeviceOrder(newDevices, user.email);
        
      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
        showSnackbar('Device deleted successfully', 'success');
    } catch (err) {
      console.error('Error deleting device:', err);
      setError(err.message);
        showSnackbar('Failed to delete device: ' + err.message, 'error');
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

  const handleDrop = async (result) => {
    if (!result.destination) return;

    const items = Array.from(devices);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update display order for all affected devices
    const updatedItems = items.map((device, index) => ({
        ...device,
        display_order: index
    }));

    setDevices(updatedItems);

    // Update preferences for each device
    for (const device of updatedItems) {
        try {
            const response = await fetch(DEVICE_PREFERENCES_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    action: 'update_preferences',
                    user_email: user.email,
                    client_id: device.client_id,
                    device_name: device.device_name || 'Unknown',
                    metrics_visibility: device.metrics_visibility || {},
                    display_order: device.display_order
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update preferences');
            }
        } catch (error) {
            console.error(`Failed to update preferences for device ${device.client_id}:`, error);
            showSnackbar(`Failed to update order for device ${device.device_name}`, 'error');
        }
    }
  };

  const handleEditClick = (device) => {
    setEditingDevice(device);
    setEditDeviceName(device.device_name);
    setEditClientId(device.client_id);
    setOpenEditDialog(true);
  };

  const handleEditDevice = async () => {
    if (!editingDevice || !editDeviceName.trim()) return;

    // Check if client ID is being changed
    if (editClientId.trim() && editClientId !== editingDevice.client_id) {
      setPendingEditData({
        action: 'update_device',
        user_email: user.email,
        old_client_id: editingDevice.client_id,
        new_client_id: editClientId.trim(),
        device_name: editDeviceName
      });
      setClientIdWarningOpen(true);
      return;
    }

    // If no client ID change, proceed with update
    await performDeviceUpdate({
      action: 'update_device',
      user_email: user.email,
      old_client_id: editingDevice.client_id,
      new_client_id: editingDevice.client_id,
      device_name: editDeviceName
    });
  };

  const performDeviceUpdate = async (updateData) => {
    try {
        // Get current metrics visibility state, including temporary changes
        const currentMetrics = {
            ...(deviceData[editingDevice.client_id]?.metrics_visibility || {}),
            ...(tempMetricsVisibility[editingDevice.client_id] || {})
        };
        const displayOrder = devices.findIndex(d => d.client_id === editingDevice.client_id);

        // First update the device name and client ID if needed
        const deviceResponse = await fetch(DEVICES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify({
          action: 'update_device',
          user_email: user.email,
                old_client_id: updateData.old_client_id,
                new_client_id: updateData.new_client_id,
                device_name: editDeviceName
        }),
      });

        if (!deviceResponse.ok) {
            const errorData = await deviceResponse.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${deviceResponse.status}`);
        }

        // Then update the preferences
        const preferencesResponse = await fetch(DEVICE_PREFERENCES_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            mode: 'cors',
            body: JSON.stringify({
                action: 'update_preferences',
        user_email: user.email,
                client_id: updateData.new_client_id,
                device_name: editDeviceName,
                metrics_visibility: currentMetrics,
                display_order: displayOrder
            }),
        });

        if (!preferencesResponse.ok) {
            const errorData = await preferencesResponse.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${preferencesResponse.status}`);
        }

        // Update the device in the local state
        const newDevices = devices.map(device => 
            device.client_id === editingDevice.client_id 
                ? { 
                    ...device, 
                    device_name: editDeviceName,
                    client_id: updateData.new_client_id,
                    metrics_visibility: currentMetrics,
                    display_order: displayOrder
                }
                : device
        );
        
        setDevices(newDevices);
        saveDeviceOrder(newDevices, user.email);

        // Update device data state
        setDeviceData(prev => ({
            ...prev,
            [updateData.new_client_id]: {
                ...prev[editingDevice.client_id],
                device_name: editDeviceName,
                metrics_visibility: currentMetrics
            }
        }));

        // Clear states
        setOpenEditDialog(false);
        setEditingDevice(null);
        setEditDeviceName("");
        setEditClientId("");
        setPendingEditData(null);
        setTempMetricsVisibility(prev => ({
            ...prev,
            [editingDevice.client_id]: {}
        }));

        // Show success message
      showSnackbar('Device updated successfully', 'success');

    } catch (err) {
      console.error('Error updating device:', err);
        setError(err.message);
        showSnackbar('Failed to update device: ' + err.message, 'error');
    }
  };

  const handleClientIdChange = (e) => {
    const value = e.target.value;
    setNewClientId(value); // Just update the value without showing warning
  };

  const handleClientIdBlur = () => {
    if (newClientId && newClientId !== editingDevice?.client_id) {
        setOpenClientIdConfirmDialog(true);
    }
  };

  const handleClientIdChangeConfirm = async () => {
    try {
        // First create a new device with the new client ID
        const addDeviceResponse = await fetch(DEVICES_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                action: 'add_device',
                user_email: user.email,
                client_id: newClientId,
                device_name: editDeviceName || editingDevice.device_name
            })
        });

        if (!addDeviceResponse.ok) {
            throw new Error('Failed to create new device');
        }

        // Then delete the old device
        const deleteResponse = await fetch(DEVICES_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                action: 'delete_device',
                user_email: user.email,
                client_id: editingDevice.client_id
            })
        });

        if (!deleteResponse.ok) {
            throw new Error('Failed to delete old device');
        }

        // Clear states and close dialogs
        setOpenClientIdConfirmDialog(false);
        setOpenEditDialog(false);
        setEditingDevice(null);
        setNewClientId('');
        setEditDeviceName('');

        // Refresh devices list
        await fetchDevices();

        showSnackbar('Device Client ID updated successfully', 'success');

    } catch (error) {
        console.error('Error updating client ID:', error);
        showSnackbar('Failed to update Client ID: ' + error.message, 'error');
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const toggleTheme = () => {
    setTheme(currentTheme === "dark" ? "light" : "dark");
  };

  // Modify getAvailableMetrics to exclude signal and battery
  const getAvailableMetrics = (deviceData) => {
    if (!deviceData) return [];
    return Object.keys(deviceData).filter(key => 
      key !== 'last_updated' && 
      key !== 'client_id' && 
      key !== 'device_name' &&
      key !== 'user_email' &&
      key !== 'signal_strength' &&
      key !== 'battery_level' &&
      key !== 'metrics_visibility' &&
      key !== 'display_order'
    );
  };

  // Add function to toggle metric visibility
  const toggleMetricVisibility = (deviceId, metric) => {
    setDeviceMetrics(prev => ({
      ...prev,
      [deviceId]: {
        ...prev[deviceId],
        [metric]: !prev[deviceId]?.[metric]
      }
    }));
  };

  // Add function to render metric value with unit
  const renderMetricValue = (value, metric) => {
    const units = {
      temperature: '°C',
      humidity: '%',
      battery_level: '%',
      signal_strength: '%',
      // Add more units as needed
    };

    const unit = units[metric] || '';
    return `${value}${unit}`;
  };

  const handleMetricsVisibilityChange = (device, metric) => {
    setTempMetricsVisibility(prev => ({
        ...prev,
        [device.client_id]: {
            ...prev[device.client_id],
            [metric]: !((prev[device.client_id] || {})[metric] ?? deviceData[device.client_id]?.metrics_visibility?.[metric] ?? true)
        }
    }));
  };

  const handleSave = async () => {
    try {
        if (!editingDevice) return;

        // First, update the device name using DEVICES_API_URL
        const updateDeviceResponse = await fetch(DEVICES_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                action: 'update_device',
                user_email: user.email,
                client_id: editingDevice.client_id,
                device_name: editDeviceName // Only updating the device name
            })
        });

        if (!updateDeviceResponse.ok) {
            throw new Error('Failed to update device name');
        }

        // Then, update the preferences
        const preferencesResponse = await fetch(DEVICE_PREFERENCES_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                action: 'update_preferences',
                user_email: user.email,
                client_id: editingDevice.client_id,
                metrics_visibility: {
                    ...(deviceData[editingDevice.client_id]?.metrics_visibility || {}),
                    ...(tempMetricsVisibility[editingDevice.client_id] || {})
                },
                display_order: editingDevice.display_order || 0
            })
        });

        if (!preferencesResponse.ok) {
            throw new Error('Failed to update preferences');
        }

        // Update local state with new device name
        setDevices(prevDevices => 
            prevDevices.map(device => 
                device.client_id === editingDevice.client_id 
                    ? { ...device, device_name: editDeviceName }
                    : device
            )
        );

        // Update device data state
        setDeviceData(prev => ({
            ...prev,
            [editingDevice.client_id]: {
                ...prev[editingDevice.client_id],
                device_name: editDeviceName,
                metrics_visibility: {
                    ...(prev[editingDevice.client_id]?.metrics_visibility || {}),
                    ...(tempMetricsVisibility[editingDevice.client_id] || {})
                }
            }
        }));

        // Clear states
        setOpenEditDialog(false);
        setEditingDevice(null);
        setEditDeviceName("");
        setTempMetricsVisibility(prev => ({
            ...prev,
            [editingDevice.client_id]: {}
        }));

        showSnackbar('Device updated successfully', 'success');

    } catch (error) {
        console.error('Error updating device:', error);
        showSnackbar('Failed to update device: ' + error.message, 'error');
    }
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    // Clear temporary changes for this device
    if (editingDevice) {
        setTempMetricsVisibility(prev => ({
            ...prev,
            [editingDevice.client_id]: {}
        }));
    }
  };

  // Filter devices based on search term
  const filteredDevices = devices.filter(device =>
      device.device_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort devices based on selected order
  const sortedDevices = useMemo(() => {
    return [...devices].sort((a, b) => {
      const order = sortOrder === "asc" ? 1 : -1;
      return (a.device_name > b.device_name ? 1 : -1) * order;
    });
  }, [devices, sortOrder]);

  const handleSortChange = (order) => {
    setSortOrder(order);
  };

  // Add the confirmation dialog component
  const ClientIdConfirmDialog = () => (
    <Dialog open={openClientIdConfirmDialog} onClose={() => setOpenClientIdConfirmDialog(false)}>
      <DialogTitle>Warning: Changing Client ID</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: 'warning.main', mb: 2 }}>
          Warning: Changing the Client ID will create a new device and the old device data will no longer be accessible. 
          This action cannot be undone.
        </DialogContentText>
        <DialogContentText>
          Are you sure you want to change the Client ID from "{editingDevice?.client_id}" to "{newClientId}"?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenClientIdConfirmDialog(false)}>Cancel</Button>
        <Button 
          onClick={handleClientIdChangeConfirm} 
          variant="contained" 
          color="warning"
        >
          Change Client ID
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <>
      <CssBaseline />
      <AppBar position="static" sx={{ bgcolor: 'background.paper', color: 'text.primary' }}>
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
        
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            mb: 4,
            pb: 2,
            borderBottom: 1,
            borderColor: 'divider'
          }}
        >
          <Box>
            <Typography 
              variant="h4" 
              gutterBottom={false}
              sx={{ 
                fontWeight: 600,
                color: 'primary.main',
                mb: 1
              }}
            >
          Your Devices
        </Typography>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 1
              }}
            >
              <Typography 
                variant="subtitle1" 
                color="text.secondary"
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Box 
                  component="span" 
                  sx={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: '50%', 
                    bgcolor: 'success.main',
                    display: 'inline-block'
                  }} 
                />
                {user.email}
        </Typography>
            </Box>
          </Box>

          <Box 
            sx={{ 
              display: 'flex', 
              gap: 1,
              mt: { xs: 2, sm: 0 }
            }}
          >
            <Button 
              variant={sortOrder === "asc" ? "contained" : "outlined"}
              size="small"
              onClick={() => handleSortChange("asc")}
              sx={{ minWidth: 120 }}
            >
              Sort A-Z
            </Button>
            <Button 
              variant={sortOrder === "desc" ? "contained" : "outlined"}
              size="small"
              onClick={() => handleSortChange("desc")}
              sx={{ minWidth: 120 }}
            >
              Sort Z-A
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {isLoading ? (
            // Show loading skeletons
            <>
              {[1, 2, 3].map((index) => (
                <Grid item xs={12} sm={6} md={4} key={`skeleton-${index}`}>
                  <DeviceSkeleton />
                </Grid>
              ))}
            </>
          ) : sortedDevices.length === 0 ? (
            // Show empty state
            <Grid item xs={12}>
              <Paper 
                sx={{ 
                  p: 4, 
                  textAlign: 'center',
                  bgcolor: 'background.paper',
                  color: 'text.primary'
                }}
              >
                <AddIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No Devices Found
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Get started by adding your first device
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => setAddDeviceOpen(true)}
                >
                  Add New Device
                </Button>
              </Paper>
            </Grid>
          ) : (
            // Show devices
            <>
          {sortedDevices.map((device) => {
                // Safely get device data and latest data
                const currentDeviceData = deviceData[device.client_id] || {};
                const latestData = currentDeviceData.latest_data || {};
                const deviceStatus = getDeviceStatus(latestData.timestamp || device.last_seen);

            return (
              <Grid item xs={12} sm={6} md={4} key={device.client_id}>
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: theme.palette.background.paper,
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6,
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
                  onClick={() => handleDeviceClick(device)}
                >
                  {/* Device Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6">
                      {device.device_name || 'Unknown Device'}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                          backgroundColor: getStatusColor(deviceStatus)
                          }}
                        />
                        <Typography variant="caption" sx={{ color: getStatusColor(deviceStatus) }}>
                          {deviceStatus}
                        </Typography>
                      </Box>
                    </Box>

                  {/* Device ID */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      ID: {showId[device.client_id] ? device.client_id : '••••••••••'}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowId(prev => ({
                          ...prev,
                          [device.client_id]: !prev[device.client_id]
                        }));
                      }}
                    >
                      {showId[device.client_id] ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </Box>

                  {/* Device Type - Updated */}
                  {latestData.device && (
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Device Type: {latestData.device}
                    </Typography>
                  )}

                  {/* Indicators */}
                  <Box sx={{ display: 'flex', gap: 2, my: 2 }}>
                    <BatteryIndicator value={Number(latestData.battery) || 0} />
                    <SignalIndicator value={Number(latestData.signal_quality) || 0} />
                  </Box>

                  {/* Metrics */}
                  <Box sx={{ mt: 1 }}>
                    {Object.entries(latestData).map(([key, value]) => {
                      // Check visibility based on preferences
                      const isVisible = currentDeviceData.metrics_visibility?.[key] ?? true;

                      // Skip non-metric fields or if not visible
                      if (!isVisible || [
                        'timestamp',
                        'client_id',
                        'device_name',
                        'user_email',
                        'signal_quality',
                        'battery',
                        'metrics_visibility',
                        'display_order',
                        'device',
                        'device_id',
                        'ClientID',
                        'last_seen',
                        'created_at',
                        'status'
                      ].includes(key)) return null;

                      // Skip if value is an object or null
                      if (value === null || typeof value === 'object') return null;

                      // Format the value
                      const formattedValue = typeof value === 'number' ? value.toFixed(1) : value;
                      const unit = key === 'temperature' ? '°C' : key === 'humidity' ? '%' : '';

                      return (
                        <Typography key={key} variant="body2" color="textSecondary">
                          {key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}: {formattedValue}{unit}
                    </Typography>
                      );
                    })}
                  </Box>

                  {/* Last Updated */}
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 'auto', pt: 1 }}>
                    Last Updated: {new Date(latestData.timestamp || device.last_seen).toLocaleString()}
                  </Typography>

                  {/* Actions */}
                  <Box sx={{ 
                      display: 'flex', 
                    justifyContent: 'flex-end', 
                      gap: 1, 
                      mt: 1,
                      pt: 1,
                    borderTop: `1px solid ${theme.palette.divider}`
                  }}>
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
            </>
          )}
        </Grid>
      </Box>

      {/* Add Device Dialog */}
      <Dialog 
        open={addDeviceOpen} 
        onClose={() => setAddDeviceOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            color: 'text.primary'
          }
        }}
      >
        <DialogTitle>Add New Device</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Device Name"
            fullWidth
            value={newDeviceName}
            onChange={(e) => setNewDeviceName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Client ID"
            fullWidth
            value={newClientId}
            onChange={(e) => setNewClientId(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDeviceOpen(false)}>Cancel</Button>
          <Button onClick={handleAddDevice} variant="contained" color="primary">
            Add Device
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            color: 'text.primary'
          }
        }}
      >
        <DialogTitle>Delete Device</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this device? This action cannot be undone.
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
        user={user}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Edit Device Dialog */}
      <Dialog 
        open={openEditDialog} 
        onClose={handleCloseEditDialog}
      >
        <DialogTitle>Edit Device</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Update device information. Client ID is optional.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Device Name"
            type="text"
            fullWidth
            variant="outlined"
            value={editDeviceName}
            onChange={(e) => setEditDeviceName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Client ID"
            type="text"
            fullWidth
            variant="outlined"
            value={newClientId || editingDevice?.client_id || ''}
            onChange={handleClientIdChange}
            onBlur={handleClientIdBlur}
            sx={{ mb: 2 }}
            helperText="Warning: Changing Client ID will create a new device and delete the old one"
          />
          
          {/* Device Type Display */}
          {editingDevice && deviceData[editingDevice.client_id]?.latest_data?.device && (
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Device Type: {deviceData[editingDevice.client_id].latest_data.device}
            </Typography>
          )}
          
          {/* Metrics Visibility Section */}
          {editingDevice && (
            <>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                    Visible Metrics
                </Typography>
                <Box sx={{ 
                    display: 'flex', 
                    flexWrap: 'wrap',
                    gap: 1,
                    mb: 2
                }}>
                    {Object.entries(deviceData[editingDevice.client_id]?.latest_data || {})
                        .filter(([key]) => {
                            // Filter out non-metric fields
                            const skipFields = [
                                'timestamp',
                                'client_id',
                                'device_name',
                                'user_email',
                                'signal_quality',
                                'battery',
                                'metrics_visibility',
                                'display_order',
                                'device',
                                'device_id',
                                'ClientID',
                                'last_seen',
                                'created_at',
                                'status'
                            ];
                            return !skipFields.includes(key);
                        })
                        .map(([key, value]) => {
                            // Skip if value is an object or null
                            if (value === null || typeof value === 'object') return null;

                            // Get the current visibility state
                            const currentVisibility = deviceData[editingDevice.client_id]?.metrics_visibility?.[key] ?? true;

                            return (
                                <FormControlLabel
                                    key={key}
                                    control={
                                        <Checkbox
                                            checked={
                                                (tempMetricsVisibility[editingDevice.client_id]?.[key] ?? 
                                                deviceData[editingDevice.client_id]?.metrics_visibility?.[key] ?? 
                                                true)
                                            }
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                handleMetricsVisibilityChange(editingDevice, key);
                                            }}
                                        />
                                    }
                                    label={key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
                                />
                            );
                        })}
                </Box>

                {/* Preview Section */}
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                    Preview
                </Typography>
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: 1,
                    p: 2,
                    bgcolor: 'background.default',
                    borderRadius: 1
                }}>
                    {/* Device Type in Preview */}
                    {deviceData[editingDevice.client_id]?.latest_data?.device && (
                        <Typography variant="body2" color="textSecondary">
                            Device Type: {deviceData[editingDevice.client_id].latest_data.device}
                        </Typography>
                    )}

                    {/* Battery and Signal Indicators */}
                    <Box sx={{ display: 'flex', gap: 2, my: 1 }}>
                        <BatteryIndicator 
                            value={Number(deviceData[editingDevice.client_id]?.latest_data?.battery) || 0} 
                        />
                        <SignalIndicator 
                            value={Number(deviceData[editingDevice.client_id]?.latest_data?.signal_quality) || 0} 
                        />
                    </Box>

                    {/* Metrics Preview */}
                    {Object.entries(deviceData[editingDevice.client_id]?.latest_data || {})
                        .filter(([key, value]) => {
                            const skipFields = [
                                'timestamp',
                                'client_id',
                                'device_name',
                                'user_email',
                                'signal_quality',
                                'battery',
                                'metrics_visibility',
                                'display_order',
                                'device',
                                'device_id',
                                'ClientID',
                                'last_seen',
                                'created_at',
                                'status'
                            ];
                            return !skipFields.includes(key) && 
                                   value !== null && 
                                   typeof value !== 'object';
                        })
                        .map(([key, value]) => {
                            // Check if this metric should be visible using temporary state
                            const isVisible = tempMetricsVisibility[editingDevice.client_id]?.[key] ?? 
                                            deviceData[editingDevice.client_id]?.metrics_visibility?.[key] ?? 
                                            true;
                            if (!isVisible) return null;

                            // Format the value
                            const formattedValue = typeof value === 'number' ? value.toFixed(1) : value;
                            const unit = key === 'temperature' ? '°C' : 
                                       key === 'humidity' ? '%' : '';

                            return (
                                <Typography key={key} variant="body2">
                                    {key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}: {formattedValue}{unit}
                                </Typography>
                            );
                        })}

                    {/* Last Updated */}
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                        Last Updated: {new Date(deviceData[editingDevice.client_id]?.latest_data?.timestamp || editingDevice.last_seen).toLocaleString()}
                    </Typography>
                </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Client ID Change Warning Dialog */}
      <Dialog 
        open={clientIdWarningOpen} 
        onClose={() => setClientIdWarningOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            color: 'text.primary'
          }
        }}
      >
        <DialogTitle>Warning: Changing Client ID</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You are about to change the device's Client ID from "{editingDevice?.client_id}" to "{newClientId}". 
            This action will:
          </DialogContentText>
          <Box component="ul" sx={{ mt: 1, mb: 2 }}>
            <Box component="li">
              <DialogContentText>
                Create a new device entry with the new Client ID
              </DialogContentText>
            </Box>
            <Box component="li">
              <DialogContentText>
                Delete the old device entry
              </DialogContentText>
            </Box>
            <Box component="li">
              <DialogContentText>
                Potentially affect any existing data or connections
              </DialogContentText>
            </Box>
          </Box>
          <DialogContentText>
            Are you sure you want to proceed with this change?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClientIdWarningOpen(false)}>Cancel</Button>
          <Button onClick={handleClientIdChangeConfirm} color="warning" variant="contained">
            Proceed with Change
          </Button>
        </DialogActions>
      </Dialog>

      <ClientIdConfirmDialog />
    </>
  );
} 