import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, CircularProgress, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, Chip, Divider } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Visibility, VisibilityOff, Sync, AccessTime, PlayArrow, Info, Close } from '@mui/icons-material';
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
  const [dialogOpen, setDialogOpen] = useState(false);


  // Effect to update uptime display based on deviceStartTimeInfo and status
  useEffect(() => {
    let intervalId;

    console.log('DeviceInfoCard uptime effect - status:', status, 'deviceStartTimeInfo:', deviceStartTimeInfo);

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
      <Card sx={{ 
        minWidth: 275, 
        mb: 2,
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid #e3f2fd'
      }}>
        <CardContent>
          <Typography color="error">{error}</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card 
      sx={{ 
        minWidth: 275, 
        mb: { xs: 0.5, sm: 1 }, 
        p: { xs: 0.25, sm: 0.5 },
        cursor: 'pointer',
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid #e3f2fd',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          transform: 'translateY(-2px)'
        }
      }}
      onClick={() => setDialogOpen(true)}
    >
      <CardContent sx={{ 
        p: { xs: 0.75, sm: 1 }, 
        '&:last-child': { pb: { xs: 0.75, sm: 1 } }
      }}>
        {/* Main content area below Device Name/Type */}
        <Box display="flex" justifyContent="space-between" width="100%" alignItems="flex-end">

          {/* Left side: ID and Timing Information */}
          <Box display="flex" flexDirection="column" gap={{ xs: 0.25, sm: 0.5 }}>
            <Box display="flex" alignItems="center" gap={0.5}>
               <Typography 
                 variant="body2" 
                 sx={{ 
                   fontSize: { xs: '0.7rem', sm: '0.75rem' },
                   fontFamily: '"Roboto Mono", "Courier New", monospace',
                   fontWeight: 500,
                   letterSpacing: '0.02em',
                   color: 'white'
                 }}
               >
                 ID: {showClientId ? clientID : '••••••••••••'}
               </Typography>
              <IconButton onClick={onToggleClientId} size="small" sx={{ p: { xs: 0.25, sm: 0.5 } }}>
                {showClientId ? <VisibilityOff sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }} /> : <Visibility sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }} />}
              </IconButton>
            </Box>
            <Box display="flex" flexDirection="column" gap={0}>
               <Box display="flex" alignItems="center" gap={0.5}>
                 <PlayArrow 
                   sx={{ 
                     fontSize: { xs: '0.8rem', sm: '0.9rem' },
                     color: 'white'
                   }} 
                 />
                 <Typography 
                   variant="body2" 
                   sx={{ 
                     fontSize: { xs: '0.7rem', sm: '0.75rem' },
                     fontFamily: '"Roboto Mono", "Courier New", monospace',
                     fontWeight: 500,
                     letterSpacing: '0.02em',
                     color: 'white'
                   }}
                 >
                   {deviceStartTimeInfo?.timestamp ? 
                     new Date(deviceStartTimeInfo.timestamp) > new Date() ? 'N/A' : 
                     new Date(deviceStartTimeInfo.timestamp).toLocaleString('en-GB', {
                       year: 'numeric',
                       month: '2-digit',
                       day: '2-digit',
                       hour: '2-digit',
                       minute: '2-digit',
                       second: '2-digit',
                       hour12: false
                     }) : 'N/A'}
                 </Typography>
               </Box>
               <Box display="flex" alignItems="center" gap={0.5}>
                 <Sync 
                   sx={{ 
                     fontSize: { xs: '0.8rem', sm: '0.9rem' },
                     color: 'white'
                   }} 
                 />
                 <Typography 
                   variant="body2" 
                   sx={{ 
                     fontSize: { xs: '0.7rem', sm: '0.75rem' },
                     fontFamily: '"Roboto Mono", "Courier New", monospace',
                     fontWeight: 500,
                     letterSpacing: '0.02em',
                     color: 'white'
                   }}
                 >
                   {lastTimestamp ? 
                     new Date(lastTimestamp).toLocaleString('en-GB', { hour12: false }) : 
                     'N/A'
                   }
                 </Typography>
               </Box>
              <Box display="flex" alignItems="center" gap={0.5}>
                <AccessTime 
                  sx={{ 
                    fontSize: { xs: '0.8rem', sm: '0.9rem' },
                    color: 'white'
                  }} 
                />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                    fontFamily: '"Roboto Mono", "Courier New", monospace',
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                    color: 'white'
                  }}
                >
                  {currentUptimeDisplay}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Right side: Status and Indicators */}
          <Box display="flex" flexDirection="column" alignItems="flex-end" justifyContent="flex-end" gap={{ xs: 0.25, sm: 0.5 }}>
            {/* Status row */}
            <Box display="flex" justifyContent="center" width="100%" pb={{ xs: 0.25, sm: 0.5 }}>
              <Box display="flex" alignItems="center" gap={0.5}>
                  <Box
                    sx={{
                    width: { xs: 5, sm: 6 },
                    height: { xs: 5, sm: 6 },
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
                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                    fontFamily: '"Roboto Mono", "Courier New", monospace',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase'
                  }}
                >
                  {status}
                </Typography>
                </Box>
            </Box>

            {/* Indicators row */}
            <Box display="flex" alignItems="flex-end" gap={{ xs: 0.75, sm: 1 }}>
              <BatteryIndicator value={batteryLevel} batteryState={batteryState} charging={charging} size="small" />
              <SignalIndicator value={signalStrength} size="small" />
                </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>

    {/* Detailed Information Dialog */}
    <Dialog 
      open={dialogOpen} 
      onClose={() => setDialogOpen(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
          color: 'white'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        pb: 1
      }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Info sx={{ fontSize: '1.5rem' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Device Information
          </Typography>
        </Box>
        <IconButton 
          onClick={() => setDialogOpen(false)}
          sx={{ color: 'white' }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={3}>
          {/* Device Overview */}
          <Grid item xs={12}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                {deviceName}
              </Typography>
              <Typography variant="body1" color="grey.300" sx={{ mb: 2 }}>
                {deviceType}
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: getStatusColor(status),
                  }}
                />
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  Status: {status}
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 2 }} />
          </Grid>

          {/* Device ID */}
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'grey.300' }}>
              Device ID
            </Typography>
            <Typography variant="body1" sx={{ 
              fontFamily: '"Roboto Mono", "Courier New", monospace',
              backgroundColor: 'rgba(255,255,255,0.1)',
              p: 1,
              borderRadius: 1
            }}>
              {clientID}
            </Typography>
          </Grid>

          {/* Battery & Signal */}
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'grey.300' }}>
              Battery & Signal
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <BatteryIndicator value={batteryLevel} batteryState={batteryState} charging={charging} size="medium" />
              <SignalIndicator value={signalStrength} size="medium" />
            </Box>
          </Grid>

          {/* Timing Information */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'grey.300' }}>
              Timing Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                  <PlayArrow sx={{ fontSize: '1.2rem' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Startup Time
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ 
                  fontFamily: '"Roboto Mono", "Courier New", monospace',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  p: 1,
                  borderRadius: 1
                }}>
                  {deviceStartTimeInfo?.timestamp ? 
                    new Date(deviceStartTimeInfo.timestamp) > new Date() ? 'N/A' : 
                    new Date(deviceStartTimeInfo.timestamp).toLocaleString('en-GB', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false
                    }) : 'N/A'}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                  <Sync sx={{ fontSize: '1.2rem' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Last Sync
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ 
                  fontFamily: '"Roboto Mono", "Courier New", monospace',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  p: 1,
                  borderRadius: 1
                }}>
                  {lastTimestamp ? 
                    new Date(lastTimestamp).toLocaleString('en-GB', { hour12: false }) : 
                    'N/A'}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                  <AccessTime sx={{ fontSize: '1.2rem' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Uptime
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ 
                  fontFamily: '"Roboto Mono", "Courier New", monospace',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  p: 1,
                  borderRadius: 1
                }}>
                  {currentUptimeDisplay}
                </Typography>
              </Grid>
            </Grid>
          </Grid>

          {/* Additional Info */}
          <Grid item xs={12}>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 2 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'grey.300' }}>
              Additional Information
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              <Chip 
                label={`Battery: ${batteryLevel}%`}
                size="small"
                sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
              <Chip 
                label={`Signal: ${signalStrength}%`}
                size="small"
                sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
              <Chip 
                label={`State: ${batteryState}`}
                size="small"
                sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
              {charging !== undefined && (
                <Chip 
                  label={`Charging: ${charging ? 'Yes' : 'No'}`}
                  size="small"
                  sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                />
              )}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button 
          onClick={() => setDialogOpen(false)}
          variant="contained"
          sx={{ 
            backgroundColor: 'rgba(255,255,255,0.2)',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' }
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
    </>
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

