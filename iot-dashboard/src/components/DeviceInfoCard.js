import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, CircularProgress, IconButton } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Visibility, VisibilityOff } from '@mui/icons-material';
import BatteryIndicator from "./BatteryIndicator";
import SignalIndicator from "./SignalIndicator";
import PropTypes from 'prop-types';

export default function DeviceInfoCard({ 
  clientID, 
  deviceName,
  deviceType,
  status, 
  lastOnline, 
  isLoading, 
  batteryLevel, 
  signalStrength,
  showClientId,
  onToggleClientId,
  batteryState,
  lastTimestamp
}) {
  const theme = useTheme();
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDeviceInfo = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://1r9r7s5b01.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-data-start-time', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: clientID
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch device info');
        }
        
        const data = await response.json();
        setDeviceInfo(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching device info:', err);
        setError('Failed to load device information');
      } finally {
        setLoading(false);
      }
    };

    fetchDeviceInfo();
    // Refresh every minute
    const interval = setInterval(fetchDeviceInfo, 60000);
    return () => clearInterval(interval);
  }, [clientID]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Online":
        return theme.palette.success.main;
      case "Offline":
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  // Convert Active/Inactive to Online/Offline for display
  const displayStatus = status === "Active" ? "Online" : "Offline";

  const formatUptime = (uptime) => {
    if (!uptime) return 'N/A';
    const parts = [];
    if (uptime.days > 0) parts.push(`${uptime.days}d`);
    if (uptime.hours > 0) parts.push(`${uptime.hours}h`);
    if (uptime.minutes > 0) parts.push(`${uptime.minutes}m`);
    if (uptime.seconds > 0) parts.push(`${uptime.seconds}s`);
    return parts.join(' ');
  };

  if (loading) {
    return (
      <Card sx={{ minWidth: 275, mb: 2 }}>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={100}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ minWidth: 275, mb: 2 }}>
        <CardContent>
          <Typography color="error">{error}</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ minWidth: 275, mb: 2 }}>
      <CardContent>
        {/* Main content area below Device Name/Type */}
        <Box display="flex" justifyContent="space-between" width="100%" alignItems="flex-end">

          {/* Left side: ID and Timing Information */}
          <Box display="flex" flexDirection="column" gap={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" color="text.secondary">
                ID: {showClientId ? clientID : '••••••••••••'}
              </Typography>
              <IconButton onClick={onToggleClientId} size="small">
                {showClientId ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </Box>
            <Box display="flex" flexDirection="column" gap={0}>
              <Typography variant="body2" color="text.secondary">
                Startup time: {deviceInfo?.timestamp ? new Date(deviceInfo.timestamp).toLocaleString() : 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last updated data: {lastOnline || 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last Uptime: {displayStatus !== "Offline" ? formatUptime(deviceInfo?.uptime) : 'N/A'}
              </Typography>
            </Box>
          </Box>

          {/* Right side: Status and Indicators */}
          <Box display="flex" flexDirection="column" alignItems="flex-end" justifyContent="flex-end" gap={1}>

            {/* Status row - Positioned between indicators below */}
            <Box display="flex" justifyContent="center" width="100%" pb={1}>
              {/* Status dot and text */}
              <Box display="flex" alignItems="center" gap={1}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: getStatusColor(displayStatus),
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    color: getStatusColor(displayStatus),
                    fontWeight: 'bold',
                    lineHeight: 'normal',
                  }}
                >
                  {displayStatus}
                </Typography>
              </Box>
            </Box>

            {/* Indicators row - Battery and Signal */}
            <Box display="flex" alignItems="flex-end" gap={2}>
              <BatteryIndicator value={deviceInfo?.battery || batteryLevel || 0} batteryState={batteryState} />
              <SignalIndicator value={deviceInfo?.signal_quality || signalStrength || 0} />
            </Box>

          </Box>

        </Box>
      </CardContent>
    </Card>
  );
}

DeviceInfoCard.propTypes = {
  clientID: PropTypes.string,
  deviceName: PropTypes.string,
  deviceType: PropTypes.string,
  status: PropTypes.string,
  lastOnline: PropTypes.string,
  isLoading: PropTypes.bool,
  batteryLevel: PropTypes.number,
  signalStrength: PropTypes.number,
  showClientId: PropTypes.bool,
  onToggleClientId: PropTypes.func,
  batteryState: PropTypes.string,
  lastTimestamp: PropTypes.string
};

DeviceInfoCard.defaultProps = {
  clientID: '',
  deviceName: '',
  deviceType: '',
  status: 'Offline',
  lastOnline: 'Never',
  isLoading: false,
  batteryLevel: 0,
  signalStrength: 0,
  showClientId: false,
  onToggleClientId: () => {},
  batteryState: 'idle',
  lastTimestamp: null
};
