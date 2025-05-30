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
  lastTimestamp,
  deviceStartTimeInfo
}) {
  const theme = useTheme();
  const [error, setError] = useState(null);
  const [currentUptimeDisplay, setCurrentUptimeDisplay] = useState('N/A');

  // Convert Active/Inactive to Online/Offline for display
  const displayStatus = status === "Active" ? "Online" : "Offline";

  // Effect to update uptime display based on deviceStartTimeInfo and status
  useEffect(() => {
    let intervalId;

    // Check if device is online and we have a valid startup timestamp
    if (displayStatus !== "Offline" && deviceStartTimeInfo?.timestamp) {
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
  }, [displayStatus, deviceStartTimeInfo?.timestamp]); // Re-run effect if displayStatus or timestamp changes

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
                Startup time: {deviceStartTimeInfo?.timestamp ? new Date(deviceStartTimeInfo.timestamp) > new Date() ? 'N/A (Future Timestamp)' : new Date(deviceStartTimeInfo.timestamp).toLocaleString() : 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last updated data: {lastOnline || 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last Uptime: {currentUptimeDisplay}
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
              <BatteryIndicator value={batteryLevel} batteryState={batteryState} />
              <SignalIndicator value={signalStrength} />
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
  lastTimestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  deviceStartTimeInfo: PropTypes.shape({
    timestamp: PropTypes.string,
  }),
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
  lastTimestamp: null,
  deviceStartTimeInfo: null,
};
