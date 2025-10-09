import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, CircularProgress, IconButton } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Visibility, VisibilityOff } from '@mui/icons-material';
import BatteryIndicator from "./BatteryIndicator";
import SignalIndicator from "./SignalIndicator";
import PropTypes from 'prop-types';

export default function DeviceInfoCard({ 
  clientID = '',
  deviceName = '',
  deviceType = '',
  status = 'Offline',
  lastOnline = 'Never',
  isLoading = false,
  batteryLevel = 0,
  signalStrength = 0,
  showClientId = false,
  onToggleClientId = () => {},
  batteryState = 'idle',
  charging = undefined,
  lastTimestamp = null,
  deviceStartTimeInfo = null
}) {
  const theme = useTheme();
  const [error, setError] = useState(null);
  const [currentUptimeDisplay, setCurrentUptimeDisplay] = useState('N/A');

  // Effect to update uptime display based on deviceStartTimeInfo and status
  useEffect(() => {
    let intervalId;

    // Check if device is online and we have a valid startup timestamp
    if (status !== "Offline" && deviceStartTimeInfo?.timestamp) {
      const startupTime = new Date(deviceStartTimeInfo.timestamp);

      // Ensure the startup time is not in the future
      if (startupTime > new Date()) {
         setCurrentUptimeDisplay('N/A (Future Timestamp)');
         return;
      }

      const updateUptime = () => {
        const now = new Date();
        // Calculate elapsed time since the startup timestamp
        const diffMs = now - startupTime;

        const seconds = Math.floor(diffMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        const remainingSeconds = seconds % 60;
        const remainingMinutes = minutes % 60;
        const remainingHours = hours % 24;
        
        const uptimeParts = { days, hours: remainingHours, minutes: remainingMinutes, seconds: remainingSeconds };
        setCurrentUptimeDisplay(formatUptime(uptimeParts));
      };

      // Initial update
      updateUptime();

      // Set up interval to update every second
      intervalId = setInterval(updateUptime, 1000);

    } else {
      // If offline or no timestamp, display N/A
      setCurrentUptimeDisplay('N/A');
    }

    // Cleanup interval on component unmount or when dependencies change
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [status, deviceStartTimeInfo?.timestamp]); // Re-run effect if status or timestamp changes

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

  const formatUptime = (uptime) => {
    if (!uptime) return 'N/A';
    const parts = [];
    if (uptime.days > 0) parts.push(`${uptime.days}d`);
    if (uptime.hours > 0) parts.push(`${uptime.hours}h`);
    if (uptime.minutes > 0) parts.push(`${uptime.minutes}m`);
    if (uptime.seconds > 0) parts.push(`${uptime.seconds}s`);
    return parts.join(' ');
  };

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
    <Card sx={{ minWidth: 275, mb: 1, p: 0.5 }}>
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
        {/* Main content area below Device Name/Type */}
        <Box display="flex" justifyContent="space-between" width="100%" alignItems="flex-end">

          {/* Left side: ID and Timing Information */}
          <Box display="flex" flexDirection="column" gap={0.5}>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                ID: {showClientId ? clientID : '••••••••••••'}
              </Typography>
              <IconButton onClick={onToggleClientId} size="small" sx={{ p: 0.5 }}>
                {showClientId ? <VisibilityOff sx={{ fontSize: '0.875rem' }} /> : <Visibility sx={{ fontSize: '0.875rem' }} />}
              </IconButton>
            </Box>
            <Box display="flex" flexDirection="column" gap={0}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Startup: {deviceStartTimeInfo?.timestamp ? new Date(deviceStartTimeInfo.timestamp) > new Date() ? 'N/A' : new Date(deviceStartTimeInfo.timestamp).toLocaleString() : 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Last update: {lastOnline || 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Uptime: {currentUptimeDisplay}
              </Typography>
            </Box>
          </Box>

          {/* Right side: Status and Indicators */}
          <Box display="flex" flexDirection="column" alignItems="flex-end" justifyContent="flex-end" gap={0.5}>
            {/* Status row */}
            <Box display="flex" justifyContent="center" width="100%" pb={0.5}>
              <Box display="flex" alignItems="center" gap={0.5}>
                  <Box
                    sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: getStatusColor(status),
                    }}
                  />
                <Typography
                  variant="body2"
                  sx={{
                    color: getStatusColor(status),
                    fontWeight: 'bold',
                    lineHeight: 'normal',
                    fontSize: '0.75rem',
                  }}
                >
                    {status}
                  </Typography>
                </Box>
            </Box>

            {/* Indicators row */}
            <Box display="flex" alignItems="flex-end" gap={1}>
              <BatteryIndicator value={batteryLevel} batteryState={batteryState} charging={charging} size="small" />
              <SignalIndicator value={signalStrength} size="small" />
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
  charging: PropTypes.number,
  lastTimestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  deviceStartTimeInfo: PropTypes.shape({
    timestamp: PropTypes.string,
  }),
};

