import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Tabs,
  Tab,
} from "@mui/material";
import { 
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ShowChart as ShowChartIcon,
  Bluetooth as BluetoothIcon,
} from '@mui/icons-material';
import BatteryIndicator from "./BatteryIndicator";
import SignalIndicator from "./SignalIndicator";
import { Helmet } from 'react-helmet';
import SettingsDrawer from "./SettingsDrawer";
import { useCustomTheme } from "./ThemeContext";
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import BluetoothControl from './BluetoothControl';

const DEVICES_API_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/devices";
const DEVICE_DATA_API_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/devices-data";
const DEVICE_PREFERENCES_API_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/devices-preferences";
const GPS_DATA_API_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/devices-gps";
const DEVICE_STATE_API_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/data-dashboard-state";
const BATTERY_STATE_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-battery-state";
const INACTIVE_TIMEOUT_MINUTES = 7; // Device is considered offline after 7 minutes of inactivity
const DEVICE_DATA_UPDATE_INTERVAL = 2 * 60 * 1000; // 2 minutes in milliseconds
const DEVICE_STATUS_UPDATE_INTERVAL = 70 * 1000; // 70 seconds in milliseconds
const BATTERY_STATE_UPDATE_INTERVAL = 15 * 1000; // 15 seconds in milliseconds

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

// Add this new component for the loading skeleton
const DeviceCardSkeleton = () => {
    const theme = useMuiTheme();

    return (
        <Grid item xs={12} sm={6} md={4}>
            <Paper
                elevation={1}
                sx={{
                    p: 2,
                    bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'background.paper',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    height: '100%',
                    transition: 'background-color 0.3s ease, transform 0.2s ease',
                    '& .MuiSkeleton-root': {
                        bgcolor: theme.palette.mode === 'dark' 
                            ? 'rgba(255, 255, 255, 0.1)' 
                            : 'rgba(0, 0, 0, 0.1)',
                        transition: 'background-color 0.3s ease'
                    }
                }}
            >
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Skeleton variant="text" width="60%" height={32} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Skeleton variant="circular" width={8} height={8} />
                        <Skeleton variant="text" width={60} />
                    </Box>
                </Box>

                {/* Device Type */}
                <Skeleton variant="text" width="40%" />

                {/* Indicators */}
                <Box sx={{ display: 'flex', gap: 2, my: 2 }}>
                    <Skeleton variant="rectangular" width={50} height={24} />
                    <Skeleton variant="rectangular" width={50} height={24} />
                </Box>

                {/* Metrics */}
                <Box sx={{ mt: 1 }}>
                    <Skeleton variant="text" width="80%" />
                    <Skeleton variant="text" width="70%" />
                    <Skeleton variant="text" width="75%" />
                </Box>

                {/* Last Updated */}
                <Skeleton variant="text" width="50%" sx={{ mt: 'auto' }} />

                {/* Actions */}
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    gap: 1, 
                    mt: 1,
                    pt: 1,
                    borderTop: `1px solid ${theme.palette.divider}`
                }}>
                    <Skeleton variant="circular" width={30} height={30} />
                    <Skeleton variant="circular" width={30} height={30} />
                    <Skeleton variant="circular" width={30} height={30} />
                </Box>
            </Paper>
        </Grid>
    );
};

const ConfigureDeviceDialog = React.memo(({ 
    device, 
    onClose, 
    deviceData, 
    setDeviceData, 
    user, 
    showSnackbar 
}) => {
    const [metricsConfig, setMetricsConfig] = useState(() => {
        // Initialize with current preferences, defaulting to true for any undefined metrics
        const currentConfig = deviceData[device.client_id]?.metrics_visibility || {};
        const availableMetrics = Object.entries(deviceData[device.client_id]?.latest_data || {})
            .filter(([key, value]) => {
                const skipFields = [
                    'timestamp', 'client_id', 'device_name', 'user_email',
                    'signal_quality', 'battery', 'metrics_visibility', 'display_order',
                    'device', 'device_id', 'ClientID', 'last_seen', 'created_at', 'status'
                ];
                return !skipFields.includes(key) && value !== null && typeof value !== 'object';
            })
            .reduce((acc, [key]) => {
                acc[key] = currentConfig[key] ?? true;
                return acc;
            }, {});
        return availableMetrics;
    });

    const handleSaveConfig = useCallback(async () => {
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
                    metrics_visibility: metricsConfig
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update metrics configuration');
            }

            // Get the current device data
            const currentData = deviceData[device.client_id];
            if (currentData?.latest_data) {
                // Keep the existing latest_data but update the metrics_visibility
                setDeviceData(prev => ({
                    ...prev,
                    [device.client_id]: {
                        ...prev[device.client_id],
                        metrics_visibility: metricsConfig
                    }
                }));
            }

            onClose();
            showSnackbar('Device configuration updated successfully', 'success');
        } catch (error) {
            console.error('Error updating metrics configuration:', error);
            showSnackbar('Failed to update configuration', 'error');
        }
    }, [device.client_id, metricsConfig, onClose, user.email, deviceData, setDeviceData, showSnackbar]);

    const handleCheckboxChange = useCallback((key) => (e) => {
        setMetricsConfig(prev => ({
            ...prev,
            [key]: e.target.checked
        }));
    }, []);
    
    const availableMetrics = useMemo(() => 
        Object.entries(deviceData[device.client_id]?.latest_data || {})
            .filter(([key, value]) => {
                const skipFields = [
                    'timestamp', 'client_id', 'device_name', 'user_email',
                    'signal_quality', 'battery', 'metrics_visibility', 'display_order',
                    'device', 'device_id', 'ClientID', 'last_seen', 'created_at', 'status'
                ];
                return !skipFields.includes(key) && value !== null && typeof value !== 'object';
            }), [device.client_id, deviceData]);

    const visibleMetrics = useMemo(() => 
        availableMetrics.filter(([key]) => metricsConfig[key]),
        [availableMetrics, metricsConfig]
    );

    return (
        <Dialog 
            open={true} 
            onClose={onClose} 
            maxWidth="sm" 
            fullWidth
            disableEscapeKeyDown
            disableBackdropClick
        >
            <DialogTitle>Configure Device Metrics</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                    Select which metrics you want to display on the device tile.
                </DialogContentText>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {availableMetrics.map(([key, value]) => (
                        <FormControlLabel
                            key={key}
                            control={
                                <Checkbox
                                    checked={metricsConfig[key]}
                                    onChange={handleCheckboxChange(key)}
                                />
                            }
                            label={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                    <Typography>
                                        {key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
                                    </Typography>
                                    <Typography color="text.secondary">
                                        Current: {typeof value === 'number' ? value.toFixed(1) : value}
                                        {key === 'temperature' ? '°C' : key === 'humidity' ? '%' : ''}
                                    </Typography>
                                </Box>
                            }
                        />
                    ))}
                </Box>

                {/* Preview Section */}
                <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
                    Preview
                </Typography>
                <Box sx={{ 
                    p: 2,
                    bgcolor: 'background.default',
                    borderRadius: 1
                }}>
                    {visibleMetrics.map(([key, value]) => (
                        <Typography key={key} variant="body2" sx={{ mb: 0.5 }}>
                            {key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}: {
                                typeof value === 'number' ? value.toFixed(1) : value
                            }{key === 'temperature' ? '°C' : key === 'humidity' ? '%' : ''}
                        </Typography>
                    ))}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSaveConfig} variant="contained" color="primary">
                    Save Configuration
                </Button>
            </DialogActions>
        </Dialog>
    );
});

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Move getDeviceStatus outside the main component
const getDeviceStatus = (deviceData) => {
  try {
    if (!deviceData?.latest_data?.timestamp) {
      return { status: 'Offline', lastSeen: null };
    }
    
    const lastUpdateTime = new Date(deviceData.latest_data.timestamp);
    const now = new Date();
    
    if (isNaN(lastUpdateTime.getTime())) {
      return { status: 'Offline', lastSeen: null };
    }
    
    const diffInMinutes = (now - lastUpdateTime) / (1000 * 60);
    
    return {
      status: diffInMinutes <= INACTIVE_TIMEOUT_MINUTES ? 'Online' : 'Offline',
      lastSeen: lastUpdateTime
    };
  } catch (error) {
    console.error('Error calculating device status:', error);
    return { status: 'Offline', lastSeen: null };
  }
};

// Add this new component for the Map View
const MapView = ({ devices, deviceData, gpsData, gpsLoading, deviceStates, onDeviceClick, getDeviceStatus }) => {
  const theme = useTheme();
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isSatelliteView, setIsSatelliteView] = useState(false);
  const [selectedDeviceForBluetooth, setSelectedDeviceForBluetooth] = useState(null);
  
  // Add CSS for popup styling
  useEffect(() => {
    // Add custom CSS for popup styling
    const style = document.createElement('style');
    style.textContent = `
      .leaflet-popup-content-wrapper {
        background-color: ${theme.palette.background.paper} !important;
        color: ${theme.palette.text.primary} !important;
      }
      .leaflet-popup-tip {
        background-color: ${theme.palette.background.paper} !important;
      }
      .leaflet-popup-close-button {
        color: ${theme.palette.text.primary} !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [theme.palette.mode]);

  // Use real GPS coordinates from API data
  const deviceLocations = useMemo(() => {
    return devices.reduce((acc, device) => {
      const gpsInfo = gpsData[device.client_id];
      if (gpsInfo && gpsInfo.latitude && gpsInfo.longitude) {
        acc[device.client_id] = [gpsInfo.latitude, gpsInfo.longitude];
      }
      return acc;
    }, {});
  }, [devices, gpsData]);

  // Calculate center point based on device locations
  const mapCenter = useMemo(() => {
    const locations = Object.values(deviceLocations);
    if (locations.length === 0) return [37.7461, 22.2372]; // Default to Peloponnese center if no devices

    // Calculate average latitude and longitude
    const sumLat = locations.reduce((sum, [lat]) => sum + lat, 0);
    const sumLng = locations.reduce((sum, [_, lng]) => sum + lng, 0);
    return [sumLat / locations.length, sumLng / locations.length];
  }, [deviceLocations]);

  // Calculate appropriate zoom level based on device spread
  const calculateZoom = useMemo(() => {
    const locations = Object.values(deviceLocations);
    if (locations.length <= 1) return 9; // Default zoom if 0 or 1 device

    // Calculate the spread of coordinates
    const lats = locations.map(([lat]) => lat);
    const lngs = locations.map(([_, lng]) => lng);
    const latSpread = Math.max(...lats) - Math.min(...lats);
    const lngSpread = Math.max(...lngs) - Math.min(...lngs);
    const maxSpread = Math.max(latSpread, lngSpread);

    // Adjust zoom level based on spread
    if (maxSpread > 1) return 7;
    if (maxSpread > 0.5) return 8;
    if (maxSpread > 0.1) return 9;
    return 10;
  }, [deviceLocations]);

  const getMarkerColor = (device) => {
    const status = getDeviceStatus(deviceData[device.client_id]);
    return status.status === 'Online' 
      ? theme.palette.mode === 'dark' ? '#66bb6a' : '#4CAF50'  // Lighter green in dark mode
      : theme.palette.mode === 'dark' ? '#ef5350' : '#F44336'; // Lighter red in dark mode
  };

  const createCustomIcon = (color) => {
    const borderColor = theme.palette.mode === 'dark' ? '#424242' : 'white';
    const shadowColor = theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)';
    const highlightColor = theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)';
    
    return L.divIcon({
      className: 'custom-icon',
      html: `<div style="
        position: relative;
        width: 32px;
        height: 32px;
        transform: translate(-50%, -50%);
      ">
        <div style="
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 18px;
          height: 18px;
          background: ${color};
          border: 2px solid ${borderColor};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 2px 4px ${shadowColor};
        "></div>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  const renderMetricValue = (value, metric) => {
    if (value === undefined || value === null) return 'No data';
    return value.toString();
  };

  // List of metrics to exclude from the popup
  const excludedMetrics = ['status', 'last_seen', 'timestamp', 'client_id', 'device_name', 'user_email'];

  return (
    <Box sx={{ height: 'calc(100vh - 200px)', width: '100%', position: 'relative' }}>
      <Box sx={{ 
        position: 'absolute', 
        top: 10, 
        right: 10, 
        zIndex: 1000,
        bgcolor: theme.palette.background.paper,
        borderRadius: 1,
        boxShadow: theme.shadows[2],
        p: 1
      }}>
        <Button
          variant={isSatelliteView ? "contained" : "outlined"}
          size="small"
          onClick={() => setIsSatelliteView(!isSatelliteView)}
          sx={{
            color: theme.palette.mode === 'dark' ? 'white' : 'inherit',
            borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.23)' : 'inherit',
            '&:hover': {
              borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'inherit',
            }
          }}
        >
          {isSatelliteView ? 'Satellite Imagery' : 'Street Map'}
        </Button>
        
        {/* GPS Status Indicator */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1, 
          ml: 2,
          p: 1,
          bgcolor: 'background.paper',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider'
        }}>
          {gpsLoading ? (
            <>
              <CircularProgress size={16} />
              <Typography variant="caption" color="text.secondary">
                Loading GPS data...
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="caption" color="text.secondary">
                📍 GPS: {Object.keys(gpsData).length} devices
              </Typography>
            </>
          )}
        </Box>
      </Box>
      <MapContainer
        center={mapCenter}
        zoom={calculateZoom}
        style={{ 
          height: '100%', 
          width: '100%',
          filter: theme.palette.mode === 'dark' ? 'brightness(0.8) contrast(1.2)' : 'none'
        }}
      >
        {isSatelliteView ? (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}
        {devices.map((device) => {
          const deviceInfo = deviceData[device.client_id];
          const metricsVisibility = deviceInfo?.metrics_visibility || {};
          const latestData = deviceInfo?.latest_data || {};
          
          // Only render marker if device has valid GPS coordinates
          const deviceLocation = deviceLocations[device.client_id];
          if (!deviceLocation || !Array.isArray(deviceLocation) || deviceLocation.length !== 2) {
            return null;
          }

          return (
            <Marker
              key={device.client_id}
              position={deviceLocation}
              icon={createCustomIcon(getMarkerColor(device))}
              eventHandlers={{
                click: () => setSelectedDevice(device),
              }}
            >
              <Popup>
                <Box sx={{ 
                  p: 1, 
                  minWidth: 200,
                  bgcolor: theme.palette.background.paper,
                  color: theme.palette.text.primary
                }}>
                  <Typography variant="h6" gutterBottom>
                    {device.device_name}
                  </Typography>
                  
                  {/* Always show battery and signal indicators */}
                  <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                    <BatteryIndicator 
                      value={latestData.battery || 0} 
                      batteryState={deviceInfo?.battery_state}
                      charging={deviceStates[device.client_id]?.charging}
                    />
                    <SignalIndicator 
                      value={latestData.signal_quality || 0} 
                    />
                  </Box>

                  {/* Show I/O states if available */}
                  {deviceStates[device.client_id] && (
                    <Box sx={{ mt: 1, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>
                        I/O States
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            bgcolor: deviceStates[device.client_id].in1_state === 1 ? 'success.main' : 'grey.400' 
                          }} />
                          <Typography variant="caption" color="text.secondary">
                            IN1: {deviceStates[device.client_id].in1_state === 1 ? 'ON' : 'OFF'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            bgcolor: deviceStates[device.client_id].in2_state === 1 ? 'success.main' : 'grey.400' 
                          }} />
                          <Typography variant="caption" color="text.secondary">
                            IN2: {deviceStates[device.client_id].in2_state === 1 ? 'ON' : 'OFF'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            bgcolor: deviceStates[device.client_id].out1_state === 1 ? 'success.main' : 'grey.400' 
                          }} />
                          <Typography variant="caption" color="text.secondary">
                            OUT1: {deviceStates[device.client_id].out1_state === 1 ? 'ON' : 'OFF'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            bgcolor: deviceStates[device.client_id].out2_state === 1 ? 'success.main' : 'grey.400' 
                          }} />
                          <Typography variant="caption" color="text.secondary">
                            OUT2: {deviceStates[device.client_id].out2_state === 1 ? 'ON' : 'OFF'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  )}

                  {/* Show key metrics in compact format */}
                  {(() => {
                    // Show only the most important metrics
                    const keyMetrics = ['motor_speed', 'temperature', 'humidity', 'pressure'];
                    const availableMetrics = keyMetrics.filter(metric => 
                      latestData[metric] !== undefined && latestData[metric] !== null
                    );
                    
                    if (availableMetrics.length === 0) return null;
                    
                    const getShortLabel = (metric) => {
                      // Return the full metric name without abbreviations
                      return metric;
                    };
                    
                    return (
                      <Box sx={{ mt: 1, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                          Status
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {availableMetrics.map((metric) => (
                            <Box key={metric} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="caption" color="text.secondary">
                                {getShortLabel(metric)}
                              </Typography>
                              <Typography variant="caption" color="text.primary" sx={{ fontWeight: 'medium' }}>
                                {renderMetricValue(latestData[metric], metric)}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    );
                  })()}

                  <Button 
                    variant="contained" 
                    size="small" 
                    fullWidth 
                    sx={{ mt: 1 }}
                    onClick={() => {
                      onDeviceClick(device);
                      setSelectedDevice(null);
                    }}
                  >
                    View Details
                  </Button>
                </Box>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Bluetooth Configuration Dialog */}
      {selectedDeviceForBluetooth && (
        <BluetoothControl
          device={selectedDeviceForBluetooth}
          onClose={() => setSelectedDeviceForBluetooth(null)}
        />
      )}
    </Box>
  );
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
  const [gpsData, setGpsData] = useState({});
  const [gpsLoading, setGpsLoading] = useState(false);
  const [deviceStates, setDeviceStates] = useState({});
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
  const [configureDialogOpen, setConfigureDialogOpen] = useState(false);
  const [configuringDevice, setConfiguringDevice] = useState(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [deviceStatuses, setDeviceStatuses] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedDeviceForBluetooth, setSelectedDeviceForBluetooth] = useState(null);

  // Update the useEffect for periodic updates
  useEffect(() => {
    // Initial fetch of all data
    const initializeDevices = async () => {
        try {
            setIsLoading(true);
            // Fetch devices and preferences only once
            await fetchDevices();
            // Fetch GPS data after devices are loaded
            await fetchGPSData();
            // Fetch device states in background (non-blocking)
            fetchDeviceStates().catch(() => {
              // Silently handle device state fetch errors
            });
            setIsLoading(false);
        } catch (error) {
            console.error('Error initializing devices:', error);
            setError(error.message);
            setIsLoading(false);
        }
    };

    initializeDevices();

    // Set up polling for device data (every 15 seconds)
    const deviceDataInterval = setInterval(() => {
        updateDevicesData();
        fetchGPSData(); // Also fetch GPS data periodically
        // Fetch device states in background (non-blocking)
        fetchDeviceStates().catch(() => {
          // Silently handle device state fetch errors
        });
    }, DEVICE_DATA_UPDATE_INTERVAL);

    return () => {
        clearInterval(deviceDataInterval);
    };
}, [user.email]);

  const updateDeviceStatus = useCallback((deviceId, newStatus) => {
    setDeviceStatuses(prev => {
      // Only update if status has been different for at least 5 seconds
      const currentStatus = prev[deviceId]?.status;
      const lastUpdate = prev[deviceId]?.lastUpdate;
      const now = Date.now();
      
      if (currentStatus === newStatus || 
          (lastUpdate && now - lastUpdate < 5000)) {
        return prev;
      }
      
      return {
        ...prev,
        [deviceId]: {
          status: newStatus,
          lastUpdate: now
        }
      };
    });
  }, []);

  const fetchBatteryState = async (clientId) => {
    try {
      const batteryStateResponse = await fetch(BATTERY_STATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: clientId
        })
      });

      if (batteryStateResponse.ok) {
        const batteryResult = await batteryStateResponse.json();
        return batteryResult.battery_state;
      }
      return 'idle';
    } catch (error) {
      console.error(`Error fetching battery state for device ${clientId}:`, error);
      return 'idle';
    }
  };

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
        console.error(`Failed to fetch data for device ${device.client_id}:`, dataResponse.statusText);
        return null;
      }

      const dataResult = await dataResponse.json();
      
      // Handle both response formats: direct {device_data: {...}} or wrapped {body: "..."}
      let deviceData;
      if (dataResult.body) {
        // Old format: wrapped in body field
        deviceData = JSON.parse(dataResult.body).device_data;
      } else if (dataResult.device_data) {
        // New format: direct device_data field
        deviceData = dataResult.device_data;
      } else {
        console.error('Invalid API response format:', dataResult);
        return null;
      }

      // Validate timestamp
      if (deviceData?.latest_data?.timestamp) {
        const timestamp = new Date(deviceData.latest_data.timestamp);
        if (isNaN(timestamp.getTime())) {
          console.error('Invalid timestamp received:', deviceData.latest_data.timestamp);
          return null;
        }
      }

      // Get preferences
      const preferencesResponse = await fetch(DEVICE_PREFERENCES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'get_device_preferences',
          user_email: user.email,
          client_id: device.client_id
        })
      });

      let metricsVisibility = {};
      if (preferencesResponse.ok) {
        const preferencesData = await preferencesResponse.json();
        metricsVisibility = preferencesData.preferences?.metrics_visibility || {};
      }

      // Filter latest_data based on preferences
      if (deviceData?.latest_data) {
        const filteredLatestData = { ...deviceData.latest_data };
        Object.keys(filteredLatestData).forEach(key => {
          if (!metricsVisibility[key] && key !== 'timestamp' && key !== 'client_id') {
            delete filteredLatestData[key];
          }
        });
        deviceData.latest_data = filteredLatestData;
      }

      const batteryState = await fetchBatteryState(device.client_id);
      return {
        ...device,
        ...deviceData,
        metrics_visibility: metricsVisibility,
        battery_state: batteryState
      };

    } catch (error) {
      console.error(`Error fetching data for device ${device.client_id}:`, error);
      return null;
    }
  };

  const fetchGPSData = async () => {
    if (devices.length === 0) return;
    
    setGpsLoading(true);
    try {
      const clientIds = devices.map(device => device.client_id);
      const response = await fetch(GPS_DATA_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_ids: clientIds
        })
      });

      if (!response.ok) {
        console.error('Failed to fetch GPS data:', response.statusText);
        return;
      }

      const result = await response.json();
      const gpsLocations = {};
      
      if (result.gps_locations) {
        result.gps_locations.forEach(location => {
          if (location.latitude !== null && location.longitude !== null) {
            gpsLocations[location.client_id] = {
              latitude: location.latitude,
              longitude: location.longitude,
              timestamp: location.timestamp,
              altitude: location.altitude,
              satellites: location.satellites
            };
          }
        });
      }
      
      setGpsData(gpsLocations);
    } catch (error) {
      console.error('Error fetching GPS data:', error);
    } finally {
      setGpsLoading(false);
    }
  };

  const fetchDeviceStates = async () => {
    if (devices.length === 0) return;
    
    try {
      // Get all client IDs
      const clientIds = devices.map(device => device.client_id);
      
      // Make a single API call for all devices
      const response = await fetch(DEVICE_STATE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_ids: clientIds
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Convert array response to object keyed by client_id
        const deviceStates = {};
        if (result.device_states && Array.isArray(result.device_states)) {
          result.device_states.forEach(state => {
            deviceStates[state.client_id] = state;
          });
        }
        setDeviceStates(deviceStates);
      } else {
        console.warn(`Device state API not available: ${response.status}`);
      }
    } catch (error) {
      console.warn('Device state API not accessible:', error.message);
    }
  };

  const fetchDevices = async () => {
    try {
        // Fetch basic device information
        const response = await fetch(DEVICES_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                action: "get_devices",
                user_email: user.email
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const fetchedDevices = data.devices || [];

        // Sort and set devices
        const sortedDevices = [...fetchedDevices].sort((a, b) => 
            (a.display_order || 0) - (b.display_order || 0)
        );
        setDevices(sortedDevices);
        saveDeviceOrder(sortedDevices, user.email);

        // Initialize device data with preferences
        const initialDeviceData = {};
        for (const device of sortedDevices) {
            // Get device data and preferences in one go
            const deviceData = await fetchDeviceData(device);
            if (deviceData) {
                initialDeviceData[device.client_id] = deviceData;
            }
        }

        setDeviceData(initialDeviceData);

    } catch (error) {
        console.error('Error fetching devices:', error);
        setError(error.message);
    }
  };

  const handleDeviceClick = (dev) => {
    // Ensure the device object includes the 'device' property (device type)
    const deviceWithResolvedType = {
      ...dev,
      device: dev.device || "SIM7080" // Use existing device type if available, otherwise default to SIM7080
    };
    onSelectDevice(deviceWithResolvedType);
    navigate("/dashboard");
  };

  const handleLogout = () => {
    setLogoutConfirmOpen(true);
  };

  const handleLogoutConfirm = () => {
    onLogout();
    navigate('/login');
    setLogoutConfirmOpen(false);
  };

  const handleLogoutCancel = () => {
    setLogoutConfirmOpen(false);
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

  const getStatusColor = (status) => {
    return status === 'Online' ? '#4caf50' : '#f44336';
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

        // Only update the device name using DEVICES_API_URL
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
                device_name: editDeviceName
            }
        }));

        // Clear states
        setOpenEditDialog(false);
        setEditingDevice(null);
        setEditDeviceName("");

        showSnackbar('Device name updated successfully', 'success');

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

  const handleConfigureClick = (device) => {
    setConfiguringDevice(device);
    setConfigureDialogOpen(true);
  };

  // Update the updateDevicesData function - Version 2.0 with robust error handling
  const updateDevicesData = async () => {
    try {
        const updatedData = {};
        let hasUpdates = false;

        for (const device of devices) {
            try {
                // Fetch device data
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

                if (!dataResponse.ok) continue;

                const dataResult = await dataResponse.json();
                
                // Debug: Log the response to understand the format
                console.log(`API Response for ${device.client_id}:`, dataResult);
                
                // Handle both response formats: direct {device_data: {...}} or wrapped {body: "..."}
                let newDeviceData;
                try {
                  if (dataResult.body && typeof dataResult.body === 'string' && dataResult.body !== 'undefined' && dataResult.body !== 'null') {
                    // Old format: wrapped in body field
                    const parsedBody = JSON.parse(dataResult.body);
                    newDeviceData = parsedBody.device_data;
                  } else if (dataResult.device_data) {
                    // New format: direct device_data field
                    newDeviceData = dataResult.device_data;
                  } else {
                    console.error('Invalid API response format:', dataResult);
                    continue;
                  }
                } catch (parseError) {
                  console.error(`Error parsing response for device ${device.client_id}:`, parseError);
                  console.error('Response data:', dataResult);
                  console.error('Body content:', dataResult.body);
                  
                  // Keep existing data to prevent device from going offline due to API errors
                  const currentDeviceData = deviceData[device.client_id];
                  if (currentDeviceData && currentDeviceData.latest_data) {
                    console.log(`Keeping existing data for ${device.client_id} due to API error`);
                    updatedData[device.client_id] = {
                      ...currentDeviceData,
                      ...device,
                      status: 'Online', // Keep as online to prevent false offline status
                      lastSeen: new Date()
                    };
                    hasUpdates = true;
                  }
                  continue;
                }

                if (!newDeviceData) continue;

                // Get preferences
                const preferencesResponse = await fetch(DEVICE_PREFERENCES_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        action: 'get_device_preferences',
                        user_email: user.email,
                        client_id: device.client_id
                    })
                });

                let metricsVisibility = {};
                if (preferencesResponse.ok) {
                    const preferencesData = await preferencesResponse.json();
                    metricsVisibility = preferencesData.preferences?.metrics_visibility || {};
                }

                // Get battery state
                const batteryState = await fetchBatteryState(device.client_id);

                // Get current device data
                const currentDeviceData = deviceData[device.client_id] || {};
                const currentLatestData = currentDeviceData.latest_data || {};

                // Check device status
                const lastUpdateTime = new Date(newDeviceData.timestamp);
                const now = new Date();
                const diffInMinutes = (now - lastUpdateTime) / (1000 * 60);
                const status = diffInMinutes <= INACTIVE_TIMEOUT_MINUTES ? 'Online' : 'Offline';

                // Only update if we have new data
                if (newDeviceData.timestamp) {
                    updatedData[device.client_id] = {
                        ...currentDeviceData,
                        ...device,
                        latest_data: {
                            ...currentLatestData, // Keep existing data as fallback
                            ...newDeviceData, // Update with new data
                            // Ensure we have all required fields with fallbacks
                            client_id: device.client_id,
                            timestamp: newDeviceData.timestamp,
                            temperature: newDeviceData.temperature ?? currentLatestData.temperature,
                            humidity: newDeviceData.humidity ?? currentLatestData.humidity,
                            pressure: newDeviceData.pressure ?? currentLatestData.pressure,
                            motor_speed: newDeviceData.motor_speed ?? currentLatestData.motor_speed,
                            battery: newDeviceData.battery ?? currentLatestData.battery,
                            signal_quality: newDeviceData.signal_quality ?? currentLatestData.signal_quality,
                            device: newDeviceData.device ?? currentLatestData.device
                        },
                        metrics_visibility: metricsVisibility,
                        battery_state: batteryState,
                        status: status,
                        lastSeen: lastUpdateTime
                    };
                    hasUpdates = true;
                }
            } catch (error) {
                console.error(`Error fetching data for device ${device.client_id}:`, error);
            }
        }

        if (hasUpdates) {
            // Single state update with all changes
            setDeviceData(prev => {
                const mergedData = { ...prev };
                Object.entries(updatedData).forEach(([clientId, data]) => {
                    mergedData[clientId] = {
                        ...prev[clientId],
                        ...data,
                        latest_data: {
                            ...prev[clientId]?.latest_data,
                            ...data.latest_data
                        }
                    };
                });
                return mergedData;
            });
        }
    } catch (error) {
        console.error('Error updating devices data:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Helmet>
        <title>Devices - IoT Dashboard</title>
      </Helmet>
      
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar sx={{ px: { xs: 1.5, sm: 3 }, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography 
              variant="h6" 
              component="div"
              sx={{ 
                fontWeight: 700,
                fontStyle: 'italic',
                letterSpacing: '0.5px',
                ml: 0.5,
                mr: 2
              }}
            >
              NB-Tech v1
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user.email}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              edge="end"
              color="inherit"
              aria-label="settings"
              onClick={() => setSettingsOpen(true)}
              sx={{ mr: 1 }}
            >
              <SettingsIcon />
            </IconButton>
            <IconButton
              edge="end"
              color="inherit"
              aria-label="logout"
              onClick={handleLogout}
              sx={{ mr: 0.5 }}
            >
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ width: '100%', mb: 2 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          indicatorColor="primary"
          textColor="primary"
          centered
          variant="fullWidth"
          sx={{ 
            mb: 1,
            '& .MuiTab-root': {
              minHeight: '36px',
              fontSize: '0.875rem',
              textTransform: 'none',
              fontWeight: 500,
              py: 0.5
            }
          }}
        >
          <Tab label="All Devices" />
          <Tab label="Map View" />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Box sx={{ p: 0 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'flex-start' },
              justifyContent: 'flex-start',
              mb: 2,
              pb: 1,
              borderBottom: 1,
              borderColor: 'divider',
              px: { xs: 2, sm: 3, md: 4 }
            }}
          >
            <Box 
              sx={{ 
                display: 'flex', 
                gap: 1,
                mt: { xs: 1, sm: 0 }
              }}
            >
              <Button 
                variant={sortOrder === "asc" ? "contained" : "outlined"}
                size="small"
                onClick={() => handleSortChange("asc")}
                sx={{ 
                  minWidth: 100,
                  py: 0.5,
                  fontSize: '0.75rem'
                }}
              >
                Sort A-Z
              </Button>
              <Button 
                variant={sortOrder === "desc" ? "contained" : "outlined"}
                size="small"
                onClick={() => handleSortChange("desc")}
                sx={{ 
                  minWidth: 100,
                  py: 0.5,
                  fontSize: '0.75rem'
                }}
              >
                Sort Z-A
              </Button>
            </Box>
          </Box>

          <Grid container spacing={3} sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
            {isLoading ? (
              // Show 6 skeleton cards while loading
              Array.from(new Array(6)).map((_, index) => (
                <DeviceCardSkeleton key={index} />
              ))
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
                  const deviceStatus = getDeviceStatus(currentDeviceData);

                  return (
                    <Grid item xs={12} sm={6} md={4} key={device.client_id}>
                      <Paper
                        sx={{
                          p: 1.5,
                          bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'background.paper',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: theme.shadows[6],
                            bgcolor: theme.palette.mode === 'dark' 
                              ? 'action.hover' 
                              : 'background.paper'
                          },
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 0.5,
                          position: 'relative',
                          overflow: 'hidden',
                          height: '100%',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '3px',
                            backgroundColor: getStatusColor(deviceStatus.status),
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDeviceForBluetooth(device);
                              }}
                              color="primary"
                              size="small"
                            >
                              <BluetoothIcon />
                            </IconButton>
                            {isUpdating && (
                              <CircularProgress size={12} sx={{ mr: 1 }} />
                            )}
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: getStatusColor(deviceStatus.status)
                              }}
                            />
                            <Typography variant="caption" sx={{ color: getStatusColor(deviceStatus.status) }}>
                              {deviceStatus.status}
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
                          <BatteryIndicator 
                            value={Number(latestData.battery) || 0} 
                            batteryState={currentDeviceData.battery_state || 'idle'}
                            charging={deviceStates[device.client_id]?.charging}
                          />
                          <SignalIndicator value={Number(latestData.signal_quality) || 0} />
                        </Box>

                        {/* Metrics */}
                        <Box sx={{ mt: 0.5 }}>
                          {Object.entries(latestData).map(([key, value]) => {
                            // Skip if value is null, undefined, or an object
                            if (value === null || value === undefined || typeof value === 'object') return null;

                            // Skip if the metric is in the excluded list
                            const excludedFields = [
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
                            if (excludedFields.includes(key)) return null;

                            // Check if the metric should be visible based on preferences
                            const metricsVisibility = currentDeviceData.metrics_visibility || {};
                            if (metricsVisibility[key] === false) return null;

                            // Format the value
                            const formattedValue = typeof value === 'number' ? value.toFixed(1) : value;
                            const unit = key === 'temperature' ? '°C' : key === 'humidity' ? '%' : '';

                            return (
                              <Typography key={key} variant="body2" color="textSecondary" sx={{ fontSize: '0.8rem', lineHeight: 1.2 }}>
                                {key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}: {formattedValue}{unit}
                              </Typography>
                            );
                          })}
                        </Box>

                        {/* Last Updated */}
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 'auto', pt: 1 }}>
                          Last Updated: {latestData.timestamp ? 
                            new Date(latestData.timestamp).toLocaleString() : 
                            'Never'
                          }
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
                          <Tooltip title="Configure Metrics">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConfigureClick(device);
                              }}
                            >
                              <SettingsIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Device">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(device);
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Device">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(device);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
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
                      bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'background.paper',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: theme.shadows[6],
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
      )}
      {activeTab === 1 && (
        <Box sx={{ p: 0 }}>
        <MapView 
          devices={devices} 
          deviceData={deviceData} 
          gpsData={gpsData}
          gpsLoading={gpsLoading}
          deviceStates={deviceStates}
          onDeviceClick={handleDeviceClick}
          getDeviceStatus={getDeviceStatus}
        />
        </Box>
      )}

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
            Update device name or client ID.
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

      {/* Configure Device Dialog */}
      <Dialog
        open={configureDialogOpen}
        onClose={() => setConfigureDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            color: 'text.primary'
          }
        }}
      >
        <DialogTitle>Configure Device</DialogTitle>
        <DialogContent>
          {/* Implement the logic to configure the device */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigureDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => {
            // Handle save configuration
            setConfigureDialogOpen(false);
            showSnackbar('Device configuration updated successfully', 'success');
          }} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Configure Device Dialog */}
      {configureDialogOpen && configuringDevice && (
        <ConfigureDeviceDialog
          device={configuringDevice}
          onClose={() => {
            setConfigureDialogOpen(false);
            setConfiguringDevice(null);
          }}
          deviceData={deviceData}
          setDeviceData={setDeviceData}
          user={user}
          showSnackbar={showSnackbar}
        />
      )}

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={logoutConfirmOpen}
        onClose={handleLogoutCancel}
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
      >
        <DialogTitle id="logout-dialog-title">{"Confirm Logout"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="logout-dialog-description">
            Are you sure you want to log out?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLogoutCancel}>Cancel</Button>
          <Button onClick={handleLogoutConfirm} autoFocus>
            Logout
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bluetooth Configuration Dialog */}
      {selectedDeviceForBluetooth && (
        <BluetoothControl
          device={selectedDeviceForBluetooth}
          onClose={() => setSelectedDeviceForBluetooth(null)}
        />
      )}
    </Box>
  );
} 