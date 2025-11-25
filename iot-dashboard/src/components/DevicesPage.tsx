import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Grid, 
  Typography, 
  Box, 
  AppBar,
  Toolbar,
  IconButton,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Paper,
  useTheme,
  Alert,
  Snackbar,
  Skeleton,
  CircularProgress,
  Checkbox,
  FormControlLabel,
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
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ShowChart as ShowChartIcon,
  Map as MapIcon,
  Refresh as RefreshIcon,
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
// @ts-ignore
import BluetoothControl from './BluetoothControl';
import { useGlobalTimer } from '../hooks/useGlobalTimer';
import { Device, User, DeviceData } from '../types';

const DEVICES_API_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/devices";
const DEVICE_DATA_API_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/devices-data";
const DEVICE_PREFERENCES_API_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/devices-preferences";
const GPS_DATA_API_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/devices-gps";
const DEVICE_STATE_API_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/data-dashboard-state";
const BATTERY_STATE_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-battery-state";
const INACTIVE_TIMEOUT_MINUTES = 7; // Device is considered offline after 7 minutes of inactivity
const DEVICE_DATA_UPDATE_INTERVAL = 2 * 60 * 1000; // 2 minutes in milliseconds

interface DevicesPageProps {
  user: User;
  onSelectDevice: (device: Device) => void;
  onLogout: () => void;
}

const DeviceCardSkeleton = () => {
    const theme = useMuiTheme();

    return (
        <Grid item xs={12} sm={6} md={4}>
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    borderRadius: 3,
                    background: theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.9) 0%, rgba(31, 37, 71, 0.95) 50%, rgba(26, 31, 60, 0.9) 100%)'
                      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 50%, rgba(255, 255, 255, 0.9) 100%)',
                    backdropFilter: 'blur(12px)',
                    border: theme.palette.mode === 'dark'
                      ? '1px solid rgba(255, 255, 255, 0.1)'
                      : '1px solid rgba(0, 0, 0, 0.08)',
                    boxShadow: theme.palette.mode === 'dark'
                      ? '0 6px 24px rgba(0, 0, 0, 0.35)'
                      : '0 6px 24px rgba(0, 0, 0, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    height: '100%',
                    transition: 'all 0.3s ease',
                    '& .MuiSkeleton-root': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
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
}: any) => {
    const [metricsConfig, setMetricsConfig] = useState(() => {
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
            .reduce((acc: any, [key]) => {
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

            const currentData = deviceData[device.client_id];
            if (currentData?.latest_data) {
                setDeviceData((prev: any) => ({
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

    const handleCheckboxChange = useCallback((key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setMetricsConfig((prev: any) => ({
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
            PaperProps={{
              sx: {
                borderRadius: 3,
                background: 'linear-gradient(135deg, rgba(26, 31, 60, 0.95) 0%, rgba(31, 37, 71, 0.98) 50%, rgba(26, 31, 60, 0.95) 100%)',
                color: '#E0E0E0',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #4caf50, #2196f3)',
                  borderRadius: '3px 3px 0 0'
                }
              }
            }}
        >
            <DialogTitle sx={{ color: '#E0E0E0' }}>Configure Device Metrics</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2, color: 'rgba(224, 224, 224, 0.7)' }}>
                    Select which metrics you want to display on the device tile.
                </DialogContentText>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {availableMetrics.map(([key, value]: [string, any]) => (
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

                <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
                    Preview
                </Typography>
                <Box sx={{ 
                    p: 2,
                    bgcolor: 'background.default',
                    borderRadius: 1
                }}>
                    {visibleMetrics.map(([key, value]: [string, any]) => (
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
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapView = ({ devices, deviceData, gpsData, gpsLoading, deviceStates, onDeviceClick, getDeviceStatus }: any) => {
  const theme = useTheme();
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isSatelliteView, setIsSatelliteView] = useState(false);
  const [selectedDeviceForBluetooth, setSelectedDeviceForBluetooth] = useState<Device | null>(null);
  
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .leaflet-popup-content-wrapper {
        background: transparent !important;
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
      }
      .leaflet-popup-content {
        margin: 0 !important; 
      }
      .leaflet-popup-tip {
        background: ${theme.palette.mode === 'dark' ? 'rgba(31, 37, 71, 0.95)' : 'rgba(255,255,255,0.95)'} !important;
        border: ${theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)'} !important;
      }
      .leaflet-popup-close-button {
        color: ${theme.palette.text.primary} !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [theme.palette.mode, theme.palette.text.primary]);

  const deviceLocations = useMemo(() => {
    return devices.reduce((acc: any, device: Device) => {
      const gpsInfo = gpsData[device.client_id];
      if (gpsInfo && gpsInfo.latitude && gpsInfo.longitude) {
        acc[device.client_id] = [gpsInfo.latitude, gpsInfo.longitude];
      }
      return acc;
    }, {});
  }, [devices, gpsData]);

  const mapCenter = useMemo(() => {
    const locations = Object.values(deviceLocations);
    if (locations.length === 0) return [37.7461, 22.2372] as [number, number];

    // @ts-ignore
    const sumLat = locations.reduce((sum: number, [lat]: number[]) => sum + lat, 0);
    // @ts-ignore
    const sumLng = locations.reduce((sum: number, [_, lng]: number[]) => sum + lng, 0);
    return [sumLat / locations.length, sumLng / locations.length] as [number, number];
  }, [deviceLocations]);

  const calculateZoom = useMemo(() => {
    const locations = Object.values(deviceLocations);
    if (locations.length <= 1) return 9;

    // @ts-ignore
    const lats = locations.map(([lat]) => lat);
    // @ts-ignore
    const lngs = locations.map(([_, lng]) => lng);
    const latSpread = Math.max(...lats) - Math.min(...lats);
    const lngSpread = Math.max(...lngs) - Math.min(...lngs);
    const maxSpread = Math.max(latSpread, lngSpread);

    if (maxSpread > 1) return 7;
    if (maxSpread > 0.5) return 8;
    if (maxSpread > 0.1) return 9;
    return 10;
  }, [deviceLocations]);

  const getMarkerColor = (device: Device) => {
    const status = getDeviceStatus(deviceData[device.client_id], device.client_id);
    return status.status === 'Online' 
      ? theme.palette.mode === 'dark' ? '#66bb6a' : '#4CAF50'
      : theme.palette.mode === 'dark' ? '#ef5350' : '#F44336';
  };

  const createCustomIcon = (color: string) => {
    const borderColor = theme.palette.mode === 'dark' ? '#424242' : 'white';
    const shadowColor = theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)';
    
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
          border-radius: 50%;
          z-index: 2;
        "></div>
        <div style="
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 0; 
          height: 0; 
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-top: 24px solid ${color};
          z-index: 1;
        "></div>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
  };

  const renderMetricValue = (value: any, metric: string) => {
    if (value === undefined || value === null) return 'No data';
    return value.toString();
  };

  return (
    <Box sx={{ height: 'calc(100vh - 200px)', width: '100%', position: 'relative' }}>
      <Box sx={{ 
        position: 'absolute', 
        top: 10, 
        right: 10, 
        zIndex: 1000,
        bgcolor: theme.palette.background.paper,
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        p: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 2
      }}>
        <Button
          variant={isSatelliteView ? "contained" : "outlined"}
          size="small"
          onClick={() => setIsSatelliteView(!isSatelliteView)}
          sx={{
            color: isSatelliteView ? 'white' : '#4CAF50',
            borderColor: isSatelliteView ? 'inherit' : '#4CAF50',
            '&:hover': {
              borderColor: isSatelliteView ? 'inherit' : '#45a049',
              backgroundColor: isSatelliteView ? 'inherit' : 'rgba(76, 175, 80, 0.1)'
            }
          }}
        >
          {isSatelliteView ? 'Satellite Imagery' : 'Street Map'}
        </Button>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
        {devices.map((device: Device) => {
          const deviceInfo = deviceData[device.client_id];
          const latestData = deviceInfo?.latest_data || {};
          
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
                  p: 2, 
                  minWidth: 220,
                  borderRadius: 3,
                  background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.9) 0%, rgba(31, 37, 71, 0.95) 50%, rgba(26, 31, 60, 0.9) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 50%, rgba(255, 255, 255, 0.9) 100%)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: theme.palette.mode === 'dark' ? '0 6px 24px rgba(0,0,0,0.35)' : '0 6px 24px rgba(0,0,0,0.08)',
                  border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                  color: theme.palette.text.primary,
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: theme.palette.mode === 'dark' ? 'linear-gradient(90deg, #4caf50, #2196f3)' : 'linear-gradient(90deg, #1976d2, #388e3c)'
                  }
                }}>
                  <Typography 
                    variant="h6" 
                    gutterBottom
                    sx={{
                      fontWeight: 600,
                      letterSpacing: '0.2px',
                      background: 'linear-gradient(45deg, #4caf50, #2196f3)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                  >
                    {device.device_name}
                  </Typography>
                  
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

                  {deviceStates[device.client_id] && (
                    <Box sx={{ 
                      mt: 1, 
                      p: 1, 
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', 
                      borderRadius: 2,
                      border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)'
                    }}>
                      <Typography variant="caption" sx={{ 
                        fontWeight: 600, 
                        display: 'block', 
                        mb: 0.75, 
                        color: theme.palette.text.primary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontSize: '0.7rem'
                      }}>
                        I/O States
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
                        {/* Inputs */}
                        <Box>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Box sx={{ 
                                width: 6, 
                                height: 6, 
                                borderRadius: '50%', 
                                backgroundColor: deviceStates[device.client_id]?.in1_state ? '#4caf50' : '#f44336' 
                              }} />
                              <Typography variant="caption" sx={{ color: theme.palette.text.primary, fontSize: '0.7rem' }}>
                                IN1: {deviceStates[device.client_id]?.in1_state ? 'ON' : 'OFF'}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Box sx={{ 
                                width: 6, 
                                height: 6, 
                                borderRadius: '50%', 
                                backgroundColor: deviceStates[device.client_id]?.in2_state ? '#4caf50' : '#f44336' 
                              }} />
                              <Typography variant="caption" sx={{ color: theme.palette.text.primary, fontSize: '0.7rem' }}>
                                IN2: {deviceStates[device.client_id]?.in2_state ? 'ON' : 'OFF'}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                        
                        {/* Outputs */}
                        <Box>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Box sx={{ 
                                width: 6, 
                                height: 6, 
                                borderRadius: '50%', 
                                backgroundColor: deviceStates[device.client_id]?.out1_state ? '#4caf50' : '#f44336' 
                              }} />
                              <Typography variant="caption" sx={{ color: theme.palette.text.primary, fontSize: '0.7rem' }}>
                                OUT1: {deviceStates[device.client_id]?.out1_state ? 'ON' : 'OFF'}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Box sx={{ 
                                width: 6, 
                                height: 6, 
                                borderRadius: '50%', 
                                backgroundColor: deviceStates[device.client_id]?.out2_state ? '#4caf50' : '#f44336' 
                              }} />
                              <Typography variant="caption" sx={{ color: theme.palette.text.primary, fontSize: '0.7rem' }}>
                                OUT2: {deviceStates[device.client_id]?.out2_state ? 'ON' : 'OFF'}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                      
                      {deviceStates[device.client_id]?.motor_speed !== undefined && (
                        <Box sx={{ mt: 0.75, pt: 0.75, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.7rem' }}>
                              Motor:
                            </Typography>
                            <Typography variant="caption" sx={{ color: theme.palette.text.primary, fontWeight: 600, fontSize: '0.7rem' }}>
                              {deviceStates[device.client_id]?.motor_speed}%
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  )}

                  {(() => {
                    const keyMetrics = ['motor_speed', 'temperature', 'humidity', 'pressure'];
                    const availableMetrics = keyMetrics.filter(metric => 
                      latestData[metric] !== undefined && latestData[metric] !== null
                    );
                    
                    if (availableMetrics.length === 0) return null;
                    
                    const getShortLabel = (metric: string) => {
                      return metric.charAt(0).toUpperCase() + metric.slice(1).replace(/_/g, ' ');
                    };
                    
                    return (
                      <Box sx={{ 
                        mt: 1, 
                        p: 1, 
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', 
                        borderRadius: 2,
                        border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)'
                      }}>
                        <Typography variant="caption" sx={{ 
                          fontWeight: 600, 
                          display: 'block', 
                          mb: 0.75, 
                          color: theme.palette.text.primary,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          fontSize: '0.7rem'
                        }}>
                          Metrics
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {availableMetrics.map((metric) => (
                            <Box key={metric} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.7rem' }}>
                                {getShortLabel(metric)}:
                              </Typography>
                              <Typography variant="caption" sx={{ color: theme.palette.text.primary, fontWeight: 600, fontSize: '0.7rem' }}>
                                {renderMetricValue(latestData[metric], metric)}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    );
                  })()}

                  <Button 
                    variant="outlined" 
                    size="small" 
                    fullWidth 
                    sx={{ 
                      mt: 1,
                      textTransform: 'none',
                      fontWeight: 600,
                      borderColor: 'text.secondary',
                      color: 'text.primary',
                      '&:hover': { borderColor: 'text.primary', backgroundColor: 'rgba(0,0,0,0.04)' }
                    }}
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

      {selectedDeviceForBluetooth && (
        <BluetoothControl
          device={selectedDeviceForBluetooth}
          onClose={() => setSelectedDeviceForBluetooth(null)}
        />
      )}
    </Box>
  );
};

const DevicesPage: React.FC<DevicesPageProps> = ({ user, onSelectDevice, onLogout }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { currentTheme, setTheme } = useCustomTheme();
  
  // Global timer hook
  const { updateDeviceStatus, getDeviceStatus: getGlobalDeviceStatus } = useGlobalTimer();
  
  // Local getDeviceStatus function that uses the global timer
  const getDeviceStatus = (deviceData: DeviceData | undefined, deviceId: string) => {
    try {
      if (!deviceData?.latest_data?.timestamp) {
        return { status: 'Checking', lastSeen: null };
      }
      
      const status = getGlobalDeviceStatus(deviceId);
      const lastUpdateTime = new Date(deviceData.latest_data.timestamp);
      const ageMs = Date.now() - lastUpdateTime.getTime();
      const fallbackStatus = ageMs <= 3 * 60 * 1000 ? 'Online' : 'Offline';
      
      const resolvedStatus = typeof status === 'string' && status.length > 0 ? status : fallbackStatus;
      
      return {
        status: resolvedStatus,
        lastSeen: lastUpdateTime
      };
    } catch (error) {
      console.error('Error calculating device status:', error);
      return { status: 'Checking', lastSeen: null };
    }
  };

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addDeviceOpen, setAddDeviceOpen] = useState(false);
  const [newClientId, setNewClientId] = useState("");
  const [newDeviceName, setNewDeviceName] = useState("");
  const [showId, setShowId] = useState<{[key: string]: boolean}>({});
  const [devices, setDevices] = useState<Device[]>(() => {
    const savedOrder = localStorage.getItem(`deviceOrder_${user.email}`);
    return savedOrder ? JSON.parse(savedOrder) : [];
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const [deviceData, setDeviceData] = useState<{[key: string]: any}>({});
  const [gpsData, setGpsData] = useState<{[key: string]: any}>({});
  const [gpsLoading, setGpsLoading] = useState(false);
  const [deviceStates, setDeviceStates] = useState<{[key: string]: any}>({});
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' | 'warning' });
  const [editDeviceName, setEditDeviceName] = useState("");
  const [editClientId, setEditClientId] = useState("");
  const [clientIdWarningOpen, setClientIdWarningOpen] = useState(false);
  const [pendingEditData, setPendingEditData] = useState<any>(null);
  const [tempMetricsVisibility, setTempMetricsVisibility] = useState<{[key: string]: any}>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [openClientIdConfirmDialog, setOpenClientIdConfirmDialog] = useState(false);
  const [configureDialogOpen, setConfigureDialogOpen] = useState(false);
  const [configuringDevice, setConfiguringDevice] = useState<Device | null>(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedDeviceForBluetooth, setSelectedDeviceForBluetooth] = useState<Device | null>(null);

  // Update device status when deviceData changes
  useEffect(() => {
    if (deviceData && Object.keys(deviceData).length > 0) {
      Object.keys(deviceData).forEach(deviceId => {
        const deviceDataItem = deviceData[deviceId];
        if (deviceDataItem?.latest_data?.timestamp) {
          updateDeviceStatus(deviceId, deviceDataItem);
        }
      });
    }
  }, [deviceData, updateDeviceStatus]);

  // Initial fetch and polling
  useEffect(() => {
    const initializeDevices = async () => {
        try {
            setIsLoading(true);
            await fetchDevices();
            await fetchGPSData();
            fetchDeviceStates().catch(() => {});
            setIsLoading(false);
        } catch (error: any) {
            console.error('Error initializing devices:', error);
            setError(error.message);
            setIsLoading(false);
        }
    };

    initializeDevices();

    const deviceDataInterval = setInterval(() => {
        updateDevicesData();
        fetchGPSData();
        fetchDeviceStates().catch(() => {});
    }, DEVICE_DATA_UPDATE_INTERVAL);

    return () => {
        clearInterval(deviceDataInterval);
    };
  }, [user.email]);

  const fetchBatteryState = async (clientId: string) => {
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

  const fetchDeviceData = async (device: Device) => {
    if (!device || !device.client_id) {
      console.error('fetchDeviceData called with invalid device:', device);
      return null;
    }
    
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
      
      let fetchedDeviceData;
      if (dataResult.body) {
        fetchedDeviceData = JSON.parse(dataResult.body).device_data;
      } else if (dataResult.device_data) {
        fetchedDeviceData = dataResult.device_data;
      } else {
        console.error('Invalid API response format:', dataResult);
        return null;
      }

      // Validate timestamp
      if (fetchedDeviceData?.latest_data?.timestamp) {
        const timestamp = new Date(fetchedDeviceData.latest_data.timestamp);
        if (isNaN(timestamp.getTime())) {
          console.error('Invalid timestamp received:', fetchedDeviceData.latest_data.timestamp);
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
      if (fetchedDeviceData?.latest_data) {
        const filteredLatestData = { ...fetchedDeviceData.latest_data };
        Object.keys(filteredLatestData).forEach(key => {
          // @ts-ignore
          if (!metricsVisibility[key] && key !== 'timestamp' && key !== 'client_id') {
            delete filteredLatestData[key];
          }
        });
        fetchedDeviceData.latest_data = filteredLatestData;
      }

      const batteryState = await fetchBatteryState(device.client_id);
      return {
        ...device,
        ...fetchedDeviceData,
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
      const gpsLocations: {[key: string]: any} = {};
      
      if (result.gps_locations) {
        result.gps_locations.forEach((location: any) => {
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
      const clientIds = devices.map(device => device.client_id);
      
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
        const deviceStates: {[key: string]: any} = {};
        if (result.device_states && Array.isArray(result.device_states)) {
          result.device_states.forEach((state: any) => {
            deviceStates[state.client_id] = state;
          });
        }
        setDeviceStates(deviceStates);
      }
    } catch (error: any) {
      console.warn('Device state API not accessible:', error.message);
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

        const sortedDevices = [...fetchedDevices].sort((a: Device, b: Device) => 
            (a.display_order || 0) - (b.display_order || 0)
        );
        setDevices(sortedDevices);
        localStorage.setItem(`deviceOrder_${user.email}`, JSON.stringify(sortedDevices));

        const initialDeviceData: {[key: string]: any} = {};
        for (const device of sortedDevices) {
            const data = await fetchDeviceData(device);
            if (data) {
                initialDeviceData[device.client_id] = data;
            }
        }

        setDeviceData(initialDeviceData);

    } catch (error: any) {
        console.error('Error fetching devices:', error);
        setError(error.message);
    }
  };

  const handleDeviceClick = (dev: Device) => {
    const deviceWithResolvedType = {
      ...dev,
      device: dev.device || "SIM7080"
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
      localStorage.setItem(`deviceOrder_${user.email}`, JSON.stringify(newDevices));
      setNewClientId("");
      setNewDeviceName("");
      setAddDeviceOpen(false);
    } catch (err: any) {
      console.error('Error adding device:', err);
      setError(err.message);
    }
  };

  const handleDeleteClick = (device: Device) => {
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

      const newDevices = devices.filter(device => device.client_id !== deviceToDelete.client_id);
      setDevices(newDevices);
      localStorage.setItem(`deviceOrder_${user.email}`, JSON.stringify(newDevices));
      
      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
      showSnackbar('Device deleted successfully', 'success');
    } catch (err: any) {
      console.error('Error deleting device:', err);
      setError(err.message);
      showSnackbar('Failed to delete device: ' + err.message, 'error');
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'Online') return '#4caf50';
    if (status === 'Offline') return '#f44336';
    return '#9e9e9e';
  };

  const handleEditClick = (device: Device) => {
    setEditingDevice(device);
    setEditDeviceName(device.device_name);
    setEditClientId(device.client_id);
    setOpenEditDialog(true);
  };

  const handleEditDevice = async () => {
    if (!editingDevice || !editDeviceName.trim()) return;

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

    await handleSave();
  };

  const handleClientIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewClientId(value);
  };

  const handleClientIdBlur = () => {
    if (newClientId && newClientId !== editingDevice?.client_id) {
        setOpenClientIdConfirmDialog(true);
    }
  };

  const handleClientIdChangeConfirm = async () => {
    if (!editingDevice) return;
    try {
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

        setOpenClientIdConfirmDialog(false);
        setOpenEditDialog(false);
        setEditingDevice(null);
        setNewClientId('');
        setEditDeviceName('');

        await fetchDevices();

        showSnackbar('Device Client ID updated successfully', 'success');

    } catch (error: any) {
        console.error('Error updating client ID:', error);
        showSnackbar('Failed to update Client ID: ' + error.message, 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleSave = async () => {
    try {
        if (!editingDevice) return;

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
                device_name: editDeviceName
            })
        });

        if (!updateDeviceResponse.ok) {
            throw new Error('Failed to update device name');
        }

        setDevices(prevDevices => 
            prevDevices.map(device => 
                device.client_id === editingDevice.client_id 
                    ? { ...device, device_name: editDeviceName }
                    : device
            )
        );

        setDeviceData(prev => ({
            ...prev,
            [editingDevice.client_id]: {
                ...prev[editingDevice.client_id],
                device_name: editDeviceName
            }
        }));

        setOpenEditDialog(false);
        setEditingDevice(null);
        setEditDeviceName("");

        showSnackbar('Device name updated successfully', 'success');

    } catch (error: any) {
        console.error('Error updating device:', error);
        showSnackbar('Failed to update device: ' + error.message, 'error');
    }
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    if (editingDevice) {
        setTempMetricsVisibility(prev => ({
            ...prev,
            [editingDevice.client_id]: {}
        }));
    }
  };

  const sortedDevices = useMemo(() => {
    return [...devices].sort((a, b) => {
      const order = sortOrder === "asc" ? 1 : -1;
      return (a.device_name > b.device_name ? 1 : -1) * order;
    });
  }, [devices, sortOrder]);

  const handleSortChange = (order: "asc" | "desc") => {
    setSortOrder(order);
  };

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

  const handleConfigureClick = (device: Device) => {
    setConfiguringDevice(device);
    setConfigureDialogOpen(true);
  };

  const updateDevicesData = async () => {
    try {
        const updatedData: {[key: string]: any} = {};
        let hasUpdates = false;

        for (const device of devices) {
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

                if (!dataResponse.ok) continue;

                const dataResult = await dataResponse.json();
                
                let newDeviceData;
                try {
                  if (dataResult.body && typeof dataResult.body === 'string' && dataResult.body !== 'undefined' && dataResult.body !== 'null') {
                    const parsedBody = JSON.parse(dataResult.body);
                    newDeviceData = parsedBody.device_data;
                  } else if (dataResult.device_data) {
                    newDeviceData = dataResult.device_data;
                  } else {
                    continue;
                  }
                } catch (parseError) {
                  const currentDeviceData = deviceData[device.client_id];
                  if (currentDeviceData && currentDeviceData.latest_data) {
                    updatedData[device.client_id] = {
                      ...currentDeviceData,
                      ...device,
                      status: 'Online',
                      lastSeen: new Date()
                    };
                    hasUpdates = true;
                  }
                  continue;
                }

                if (!newDeviceData) continue;

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

                const batteryState = await fetchBatteryState(device.client_id);

                const currentDeviceData = deviceData[device.client_id] || {};
                const currentLatestData = currentDeviceData.latest_data || {};

                const lastUpdateTime = new Date(newDeviceData.timestamp);
                const now = new Date();
                const diffInMinutes = (now.getTime() - lastUpdateTime.getTime()) / (1000 * 60);
                const status = diffInMinutes <= INACTIVE_TIMEOUT_MINUTES ? 'Online' : 'Offline';

                if (newDeviceData.timestamp) {
                    updatedData[device.client_id] = {
                        ...currentDeviceData,
                        ...device,
                        latest_data: {
                            ...currentLatestData, 
                            ...newDeviceData,
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ 
      flexGrow: 1, 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: theme.palette.mode === 'dark'
        ? 'linear-gradient(135deg, #141829 0%, #1a1f3c 50%, #141829 100%)'
        : 'linear-gradient(135deg, #f5f5f5 0%, #e8f4fd 50%, #f5f5f5 100%)',
      color: theme.palette.text.primary,
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: theme.palette.mode === 'dark'
          ? 'radial-gradient(circle at 20% 50%, rgba(76, 175, 80, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(33, 150, 243, 0.1) 0%, transparent 50%)'
          : 'radial-gradient(circle at 20% 50%, rgba(76, 175, 80, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(33, 150, 243, 0.05) 0%, transparent 50%)',
        pointerEvents: 'none'
      }
    }}>
      <Helmet>
        <title>Devices - IoT Dashboard</title>
        <style>{`
          @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.1); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </Helmet>
      
      <AppBar 
        position="static" 
        color="default" 
        elevation={2}
        sx={{
          background: currentTheme === 'dark' 
            ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.95) 0%, rgba(31, 37, 71, 0.98) 50%, rgba(26, 31, 60, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.98) 50%, rgba(255, 255, 255, 0.95) 100%)',
          backdropFilter: 'blur(10px)',
          borderBottom: currentTheme === 'dark' 
            ? '1px solid rgba(255, 255, 255, 0.1)' 
            : '1px solid rgba(0, 0, 0, 0.1)',
          boxShadow: currentTheme === 'dark'
            ? '0 4px 20px rgba(0, 0, 0, 0.3)'
            : '0 4px 20px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Toolbar sx={{ 
          px: { xs: 1.5, sm: 3 }, 
          display: 'flex', 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          minHeight: '64px'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography 
                variant="h6" 
                component="div"
                sx={{ 
                  fontWeight: 700,
                  fontStyle: 'italic',
                  letterSpacing: '0.5px',
                  background: currentTheme === 'dark'
                    ? 'linear-gradient(45deg, #4caf50, #2196f3)'
                    : 'linear-gradient(45deg, #1976d2, #388e3c)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                NB-Tech v1
              </Typography>
              <Box sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                backgroundColor: currentTheme === 'dark' 
                  ? 'rgba(76, 175, 80, 0.2)' 
                  : 'rgba(76, 175, 80, 0.1)',
                border: `1px solid ${currentTheme === 'dark' ? 'rgba(76, 175, 80, 0.3)' : 'rgba(76, 175, 80, 0.2)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}>
                <Box sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#4caf50',
                  animation: 'pulse 2s infinite'
                }} />
              </Box>
            </Box>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                display: { xs: 'none', sm: 'block' },
                color: currentTheme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                fontWeight: 500,
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                backgroundColor: currentTheme === 'dark' 
                  ? 'rgba(255,255,255,0.05)' 
                  : 'rgba(0,0,0,0.05)',
                border: `1px solid ${currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
              }}
            >
              {user.email}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>

            {/* Refresh Button */}
            <Tooltip title="Refresh devices">
              <IconButton
                edge="end"
                color="inherit"
                aria-label="refresh"
                onClick={async () => {
                  try {
                    setIsLoading(true);
                    await Promise.all([
                      fetchDevices(),
                      fetchGPSData(),
                      fetchDeviceStates()
                    ]);
                    if (devices && devices.length > 0) {
                      const deviceDataPromises = devices.map(device => fetchDeviceData(device));
                      await Promise.all(deviceDataPromises);
                    }
                  } catch (error) {
                    console.error('Error refreshing data:', error);
                  } finally {
                    setIsLoading(false);
                  }
                }}
                sx={{ 
                  mr: 1,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    transform: 'scale(1.05)'
                  }
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>

            {/* Settings */}
            <Tooltip title="Settings">
              <IconButton
                edge="end"
                color="inherit"
                aria-label="settings"
                onClick={() => setSettingsOpen(true)}
                sx={{ 
                  mr: 1,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    transform: 'scale(1.05)'
                  }
                }}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>

            {/* Logout */}
            <Tooltip title="Logout">
              <IconButton
                edge="end"
                color="inherit"
                aria-label="logout"
                onClick={handleLogout}
                sx={{ 
                  mr: 0.5,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    transform: 'scale(1.05)'
                  }
                }}
              >
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ 
        width: '100%', 
        mb: 2,
        background: currentTheme === 'dark'
          ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.8) 0%, rgba(31, 37, 71, 0.9) 50%, rgba(26, 31, 60, 0.8) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.9) 50%, rgba(255, 255, 255, 0.8) 100%)',
        backdropFilter: 'blur(10px)',
        borderRadius: 3,
        mx: 2,
        mt: 1,
        border: currentTheme === 'dark' 
          ? '1px solid rgba(255, 255, 255, 0.1)' 
          : '1px solid rgba(0, 0, 0, 0.1)',
        boxShadow: currentTheme === 'dark'
          ? '0 4px 20px rgba(0, 0, 0, 0.2)'
          : '0 4px 20px rgba(0, 0, 0, 0.1)'
      }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          indicatorColor="primary"
          textColor="primary"
          centered
          variant="fullWidth"
          sx={{ 
            mb: 0,
            '& .MuiTab-root': {
              minHeight: '48px',
              fontSize: '0.875rem',
              textTransform: 'none',
              fontWeight: 600,
              py: 1,
              px: 2,
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: currentTheme === 'dark' 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : 'rgba(0, 0, 0, 0.05)',
                transform: 'translateY(-1px)'
              },
              '&.Mui-selected': {
                color: currentTheme === 'dark' ? '#4caf50' : '#1976d2',
                fontWeight: 700
              }
            },
            '& .MuiTabs-indicator': {
              height: '3px',
              borderRadius: '3px 3px 0 0',
              background: currentTheme === 'dark'
                ? 'linear-gradient(90deg, #4caf50, #2196f3)'
                : 'linear-gradient(90deg, #1976d2, #388e3c)'
            }
          }}
        >
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShowChartIcon sx={{ fontSize: '1.1rem' }} />
                All Devices
              </Box>
            } 
          />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MapIcon sx={{ fontSize: '1.1rem', color: 'inherit' }} key="map-icon" />
                    Map View
                  </Box>
                } 
              />
        </Tabs>
      </Box>

      {/* Status Information Bar */}
      <Box sx={{ 
        mx: 2, 
        mb: 2,
        p: 2,
        background: currentTheme === 'dark'
          ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.6) 0%, rgba(31, 37, 71, 0.7) 50%, rgba(26, 31, 60, 0.6) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(248, 250, 252, 0.7) 50%, rgba(255, 255, 255, 0.6) 100%)',
        backdropFilter: 'blur(10px)',
        borderRadius: 3,
        border: currentTheme === 'dark' 
          ? '1px solid rgba(255, 255, 255, 0.1)' 
          : '1px solid rgba(0, 0, 0, 0.1)',
        boxShadow: currentTheme === 'dark'
          ? '0 4px 20px rgba(0, 0, 0, 0.15)'
          : '0 4px 20px rgba(0, 0, 0, 0.08)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          {/* Online/Offline Summary */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: '#4caf50',
                animation: 'pulse 2s infinite'
              }} />
              <Typography variant="body2" sx={{ 
                fontWeight: 600,
                color: currentTheme === 'dark' ? '#4caf50' : '#2e7d32'
              }}>
                {devices.filter(device => {
                  const deviceStatus = getDeviceStatus(deviceData[device.client_id], device.client_id);
                  return deviceStatus.status === 'Online';
                }).length} Online
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: '#f44336'
              }} />
              <Typography variant="body2" sx={{ 
                fontWeight: 600,
                color: currentTheme === 'dark' ? '#f44336' : '#d32f2f'
              }}>
                {devices.filter(device => {
                  const deviceStatus = getDeviceStatus(deviceData[device.client_id], device.client_id);
                  return deviceStatus.status === 'Offline';
                }).length} Offline
              </Typography>
            </Box>
          </Box>

          {/* Last Update Info */}
          <Typography variant="caption" sx={{ 
            color: currentTheme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
            fontStyle: 'italic'
          }}>
            Last updated: {new Date().toLocaleTimeString('en-GB', { hour12: false })}
          </Typography>
        </Box>
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
            {(isLoading || gpsLoading || Object.keys(deviceData || {}).length === 0) ? (
              Array.from(new Array(6)).map((_, index) => (
                <DeviceCardSkeleton key={index} />
              ))
            ) : sortedDevices.length === 0 ? (
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
              <>
                {sortedDevices.map((device) => {
                  const currentDeviceData = deviceData[device.client_id] || {};
                  const latestData = currentDeviceData.latest_data || {};
                  const deviceStatus = getDeviceStatus(currentDeviceData, device.client_id);

                  return (
                    <Grid item xs={12} sm={6} md={4} key={device.client_id}>
                      <Paper
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          background: theme.palette.mode === 'dark'
                            ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.9) 0%, rgba(31, 37, 71, 0.95) 50%, rgba(26, 31, 60, 0.9) 100%)'
                            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 50%, rgba(255, 255, 255, 0.9) 100%)',
                          backdropFilter: 'blur(12px)',
                          boxShadow: theme.palette.mode === 'dark' ? '0 6px 24px rgba(0,0,0,0.35)' : '0 6px 24px rgba(0,0,0,0.08)',
                          border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                          color: theme.palette.text.primary,
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                            transform: 'translateY(-2px)'
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
                            height: '4px',
                            backgroundColor: getStatusColor(deviceStatus.status),
                            transition: 'background-color 0.3s ease',
                          }
                        }}
                        onClick={() => handleDeviceClick(device)}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="h6" sx={{ color: '#E0E0E0' }}>
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
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                px: 1,
                                py: 0.25,
                                borderRadius: '999px',
                                border: `1px solid ${getStatusColor(deviceStatus.status)}AA`,
                                backgroundColor: deviceStatus.status === 'Online' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)',
                                color: getStatusColor(deviceStatus.status),
                                fontWeight: 600,
                                fontSize: '0.7rem',
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase'
                              }}
                            >
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: getStatusColor(deviceStatus.status) }} />
                              {deviceStatus.status}
                            </Box>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="body2" color="textSecondary" sx={{ color: 'rgba(224,224,224,0.8)' }}>
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

                        {latestData.device && (
                          <Box sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.75,
                            px: 1,
                            py: 0.5,
                            borderRadius: 2,
                            border: '1px solid #e3f2fd',
                            background: 'linear-gradient(135deg, rgba(26, 31, 60, 0.6) 0%, rgba(31, 37, 71, 0.8) 50%, rgba(26, 31, 60, 0.6) 100%)',
                            color: 'rgba(224,224,224,0.85)',
                            width: 'fit-content',
                            mb: 1
                          }}>
                            <Box sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: 'linear-gradient(90deg, #4caf50, #2196f3)'
                            }} />
                            <Typography variant="caption" sx={{ fontWeight: 500, letterSpacing: '0.2px' }}>
                              {latestData.device}
                            </Typography>
                          </Box>
                        )}

                        <Box sx={{ display: 'flex', gap: 2, my: 2 }}>
                          <BatteryIndicator 
                            value={Number(latestData.battery) || 0} 
                            batteryState={currentDeviceData.battery_state || 'idle'}
                            charging={deviceStates[device.client_id]?.charging}
                          />
                          <SignalIndicator value={Number(latestData.signal_quality) || 0} />
                        </Box>

                        {deviceStates[device.client_id] && (
                          <Box sx={{ 
                            mt: 1, 
                            mb: 1.5, 
                            p: 1, 
                            bgcolor: 'rgba(255,255,255,0.05)', 
                            borderRadius: 2,
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}>
                            <Typography variant="caption" sx={{ 
                              fontWeight: 600, 
                              display: 'block', 
                              mb: 0.75, 
                              color: '#E0E0E0',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              fontSize: '0.7rem'
                            }}>
                              I/O States
                            </Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
                              <Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{ 
                                      width: 6, 
                                      height: 6, 
                                      borderRadius: '50%', 
                                      backgroundColor: deviceStates[device.client_id]?.in1_state ? '#4caf50' : '#f44336' 
                                    }} />
                                    <Typography variant="caption" sx={{ color: '#E0E0E0', fontSize: '0.7rem' }}>
                                      IN1: {deviceStates[device.client_id]?.in1_state ? 'ON' : 'OFF'}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{ 
                                      width: 6, 
                                      height: 6, 
                                      borderRadius: '50%', 
                                      backgroundColor: deviceStates[device.client_id]?.in2_state ? '#4caf50' : '#f44336' 
                                    }} />
                                    <Typography variant="caption" sx={{ color: '#E0E0E0', fontSize: '0.7rem' }}>
                                      IN2: {deviceStates[device.client_id]?.in2_state ? 'ON' : 'OFF'}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Box>
                              
                              <Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{ 
                                      width: 6, 
                                      height: 6, 
                                      borderRadius: '50%', 
                                      backgroundColor: deviceStates[device.client_id]?.out1_state ? '#4caf50' : '#f44336' 
                                    }} />
                                    <Typography variant="caption" sx={{ color: '#E0E0E0', fontSize: '0.7rem' }}>
                                      OUT1: {deviceStates[device.client_id]?.out1_state ? 'ON' : 'OFF'}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{ 
                                      width: 6, 
                                      height: 6, 
                                      borderRadius: '50%', 
                                      backgroundColor: deviceStates[device.client_id]?.out2_state ? '#4caf50' : '#f44336' 
                                    }} />
                                    <Typography variant="caption" sx={{ color: '#E0E0E0', fontSize: '0.7rem' }}>
                                      OUT2: {deviceStates[device.client_id]?.out2_state ? 'ON' : 'OFF'}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Box>
                            </Box>
                            
                            {deviceStates[device.client_id]?.motor_speed !== undefined && (
                              <Box sx={{ mt: 0.75, pt: 0.75, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                  <Typography variant="caption" sx={{ color: 'rgba(224,224,224,0.7)', fontSize: '0.7rem' }}>
                                    Motor:
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#E0E0E0', fontWeight: 600, fontSize: '0.7rem' }}>
                                    {deviceStates[device.client_id]?.motor_speed}%
                                  </Typography>
                                </Box>
                              </Box>
                            )}
                          </Box>
                        )}

                        {(() => {
                          const metrics = Object.entries(latestData).filter(([key, value]) => {
                            if (value === null || value === undefined || typeof value === 'object') return false;
                            
                            const excludedFields = [
                              'timestamp', 'client_id', 'device_name', 'user_email',
                              'signal_quality', 'battery', 'metrics_visibility', 'display_order',
                              'device', 'device_id', 'ClientID', 'last_seen', 'created_at', 'status',
                              'in1_state', 'in2_state', 'out1_state', 'out2_state',
                              'motor_speed', 'charging', 'power_saving'
                            ];
                            if (excludedFields.includes(key)) return false;
                            
                            const metricsVisibility = currentDeviceData.metrics_visibility || {};
                            // @ts-ignore
                            if (metricsVisibility[key] === false) return false;
                            
                            return true;
                          });

                          if (metrics.length === 0) return null;

                          return (
                            <Box sx={{ 
                              mt: 1, 
                              mb: 1.5, 
                              p: 1, 
                              bgcolor: 'rgba(255,255,255,0.05)', 
                              borderRadius: 2,
                              border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                              <Typography variant="caption" sx={{ 
                                fontWeight: 600, 
                                display: 'block', 
                                mb: 0.75, 
                                color: '#E0E0E0', 
                                textTransform: 'uppercase', 
                                letterSpacing: '0.5px', 
                                fontSize: '0.7rem'
                              }}>
                                Metrics
                              </Typography>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                {metrics.map(([key, value]) => {
                                  const formattedValue = typeof value === 'number' ? value.toFixed(1) : value;
                                  const unit = key === 'temperature' ? '°C' : key === 'humidity' ? '%' : key === 'pressure' ? ' hPa' : '';
                                  const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');

                                  return (
                                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                      <Typography variant="caption" sx={{ color: 'rgba(224,224,224,0.7)', fontSize: '0.7rem' }}>
                                        {label}:
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: '#E0E0E0', fontWeight: 600, fontSize: '0.7rem' }}>
                                        {formattedValue as string}{unit}
                                      </Typography>
                                    </Box>
                                  );
                                })}
                              </Box>
                            </Box>
                          );
                        })()}

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 'auto', pt: 1, color: 'rgba(224,224,224,0.7)' }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: 'linear-gradient(90deg, #2196f3, #4caf50)' }} />
                          <Typography variant="caption" sx={{ color: 'rgba(224,224,224,0.75)' }}>
                            {latestData.timestamp ? new Date(latestData.timestamp).toLocaleString('en-GB', { hour12: false }) : 'Never'}
                          </Typography>
                        </Box>

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

                <Grid item xs={12} sm={6} md={4}>
                  <Paper
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                      border: '1px solid #e3f2fd',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                        transform: 'translateY(-2px)'
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
          devices={sortedDevices} 
          deviceData={deviceData} 
          gpsData={gpsData}
          gpsLoading={gpsLoading}
          deviceStates={deviceStates}
          onDeviceClick={handleDeviceClick}
          getDeviceStatus={getDeviceStatus}
        />
        </Box>
      )}

      <Dialog 
        open={addDeviceOpen} 
        onClose={() => setAddDeviceOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(26, 31, 60, 0.95) 0%, rgba(31, 37, 71, 0.98) 50%, rgba(26, 31, 60, 0.95) 100%)',
            color: '#E0E0E0',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #4caf50, #2196f3)',
              borderRadius: '3px 3px 0 0'
            }
          }
        }}
      >
        <DialogTitle sx={{ color: '#E0E0E0' }}>Add New Device</DialogTitle>
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

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(26, 31, 60, 0.95) 0%, rgba(31, 37, 71, 0.98) 50%, rgba(26, 31, 60, 0.95) 100%)',
            color: '#E0E0E0',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #f44336, #ff9800)',
              borderRadius: '3px 3px 0 0'
            }
          }
        }}
      >
        <DialogTitle sx={{ color: '#E0E0E0' }}>Delete Device</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'rgba(224, 224, 224, 0.7)' }}>
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

      <Dialog 
        open={openEditDialog} 
        onClose={handleCloseEditDialog}
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(26, 31, 60, 0.95) 0%, rgba(31, 37, 71, 0.98) 50%, rgba(26, 31, 60, 0.95) 100%)',
            color: '#E0E0E0',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #4caf50, #2196f3)'
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, background: 'linear-gradient(45deg, #4caf50, #2196f3)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Edit Device</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'rgba(224, 224, 224, 0.7)', mb: 1 }}>
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
          <Button onClick={handleCloseEditDialog} variant="outlined" sx={{ textTransform: 'none', borderColor: 'text.secondary', color: 'text.primary', '&:hover': { borderColor: 'text.primary', backgroundColor: 'rgba(0,0,0,0.04)' } }}>Cancel</Button>
          <Button onClick={handleEditDevice} variant="outlined" sx={{ textTransform: 'none', fontWeight: 600, borderColor: 'text.secondary', color: 'text.primary', '&:hover': { borderColor: 'text.primary', backgroundColor: 'rgba(0,0,0,0.04)' } }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={clientIdWarningOpen} 
        onClose={() => setClientIdWarningOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(26, 31, 60, 0.95) 0%, rgba(31, 37, 71, 0.98) 50%, rgba(26, 31, 60, 0.95) 100%)',
            color: '#E0E0E0',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #ff9800, #e91e63)'
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, background: 'linear-gradient(45deg, #ff9800, #e91e63)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Warning: Changing Client ID</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'rgba(224, 224, 224, 0.85)' }}>
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
          <DialogContentText sx={{ color: 'rgba(224, 224, 224, 0.7)' }}>
            Are you sure you want to proceed with this change?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClientIdWarningOpen(false)} variant="outlined" sx={{ textTransform: 'none', borderColor: 'text.secondary', color: 'text.primary', '&:hover': { borderColor: 'text.primary', backgroundColor: 'rgba(0,0,0,0.04)' } }}>Cancel</Button>
          <Button onClick={handleClientIdChangeConfirm} variant="outlined" sx={{ textTransform: 'none', fontWeight: 600, borderColor: 'warning.main', color: 'warning.main', '&:hover': { borderColor: 'warning.dark', backgroundColor: 'rgba(255,152,0,0.06)' } }}>
            Proceed with Change
          </Button>
        </DialogActions>
      </Dialog>

      <ClientIdConfirmDialog />

      <Dialog
        open={configureDialogOpen}
        onClose={() => setConfigureDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(26, 31, 60, 0.95) 0%, rgba(31, 37, 71, 0.98) 50%, rgba(26, 31, 60, 0.95) 100%)',
            color: '#E0E0E0',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #4caf50, #2196f3)'
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, background: 'linear-gradient(45deg, #4caf50, #2196f3)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Configure Device</DialogTitle>
        <DialogContent>
          {/* Implement the logic to configure the device */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigureDialogOpen(false)} variant="outlined" sx={{ textTransform: 'none', borderColor: 'text.secondary', color: 'text.primary', '&:hover': { borderColor: 'text.primary', backgroundColor: 'rgba(0,0,0,0.04)' } }}>Cancel</Button>
          <Button onClick={() => {
            setConfigureDialogOpen(false);
            showSnackbar('Device configuration updated successfully', 'success');
          }} variant="outlined" sx={{ textTransform: 'none', fontWeight: 600, borderColor: 'text.secondary', color: 'text.primary', '&:hover': { borderColor: 'text.primary', backgroundColor: 'rgba(0,0,0,0.04)' } }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

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

      <Dialog
        open={logoutConfirmOpen}
        onClose={handleLogoutCancel}
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(26, 31, 60, 0.95) 0%, rgba(31, 37, 71, 0.98) 50%, rgba(26, 31, 60, 0.95) 100%)',
            color: '#E0E0E0',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #f44336, #ff9800)',
              borderRadius: '3px 3px 0 0'
            }
          }
        }}
      >
        <DialogTitle id="logout-dialog-title" sx={{ color: '#E0E0E0' }}>{"Confirm Logout"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="logout-dialog-description" sx={{ color: 'rgba(224, 224, 224, 0.7)' }}>
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
    </Box>
  );
};

export default DevicesPage;

