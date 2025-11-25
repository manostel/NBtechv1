import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, Divider } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Visibility, VisibilityOff, Sync, AccessTime, PlayArrow, Info, Close, Build, Storage } from '@mui/icons-material';
import BatteryIndicator from "../../../components/common/BatteryIndicator";
import SignalIndicator from "../../../components/common/SignalIndicator";

// Types
interface DeviceStartTimeInfo {
  timestamp?: string;
  startup_data?: {
    firmware_version?: string;
    boot_reason?: string;
  };
}

interface Uptime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

// Shared uptime calculation logic
const useUptime = (status: string, deviceStartTimeInfo: DeviceStartTimeInfo | null) => {
  const [currentUptimeDisplay, setCurrentUptimeDisplay] = useState('N/A');

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (status !== "Offline" && deviceStartTimeInfo?.timestamp) {
      const startupTime = new Date(deviceStartTimeInfo.timestamp);

      if (startupTime > new Date()) {
        setCurrentUptimeDisplay('N/A (Future Timestamp)');
        return;
      }

      const formatUptime = (uptime: Uptime) => {
        const parts: string[] = [];
        if (uptime.days > 0) parts.push(`${uptime.days}d`);
        if (uptime.hours > 0) parts.push(`${uptime.hours}h`);
        if (uptime.minutes > 0) parts.push(`${uptime.minutes}m`);
        if (uptime.seconds > 0) parts.push(`${uptime.seconds}s`);
        return parts.join(' ');
      };

      const updateUptime = () => {
        const now = new Date();
        const diffMs = now.getTime() - startupTime.getTime();
        const seconds = Math.floor(diffMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const remainingSeconds = seconds % 60;
        const remainingMinutes = minutes % 60;
        const remainingHours = hours % 24;
        
        const uptimeParts: Uptime = { 
          days, 
          hours: remainingHours, 
          minutes: remainingMinutes, 
          seconds: remainingSeconds 
        };
        setCurrentUptimeDisplay(formatUptime(uptimeParts));
      };

      updateUptime();
      intervalId = setInterval(updateUptime, 1000);
    } else {
      setCurrentUptimeDisplay('N/A');
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [status, deviceStartTimeInfo?.timestamp]);

  return currentUptimeDisplay;
};

interface DeviceInfoDialogProps {
  open: boolean;
  onClose: () => void;
  deviceName: string;
  deviceType: string;
  clientID: string;
  status: string;
  batteryLevel: number;
  signalStrength: number;
  batteryState: string;
  charging?: any;
  deviceStartTimeInfo: DeviceStartTimeInfo | null;
  lastTimestamp?: string | Date | null;
  currentUptimeDisplay: string;
}

// Shared dialog component
const DeviceInfoDialog: React.FC<DeviceInfoDialogProps> = ({ 
  open, 
  onClose, 
  deviceName, 
  deviceType, 
  clientID, 
  status, 
  batteryLevel, 
  signalStrength, 
  batteryState, 
  charging, 
  deviceStartTimeInfo, 
  lastTimestamp, 
  currentUptimeDisplay 
}) => {
  const [showClientId, setShowClientId] = useState(false);

  // Reset visibility when dialog closes
  useEffect(() => {
    if (!open) {
      setShowClientId(false);
    }
  }, [open]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Online":
        return '#4caf50';
      case "Offline":
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  const maskClientId = (id: string) => {
    if (!id) return '';
    return '•'.repeat(id.length);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
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
            borderRadius: '2px 2px 0 0'
          }
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
          <Typography variant="h6" sx={{ fontWeight: 300, fontFamily: '"Exo 2", "Roboto", "Helvetica", "Arial", sans-serif' }}>
            Device Information
          </Typography>
        </Box>
        <IconButton 
          onClick={onClose}
          sx={{ color: 'rgba(224, 224, 224, 0.7)' }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 300, mb: 1, fontFamily: '"Exo 2", "Roboto", "Helvetica", "Arial", sans-serif' }}>
                {deviceName}
              </Typography>
              <Typography variant="body1" color="grey.300" sx={{ mb: 2, fontSize: { xs: '0.95rem', sm: '1rem' } }}>
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
                <Typography variant="body1" sx={{ fontWeight: 400, fontFamily: '"Exo 2", "Roboto", "Helvetica", "Arial", sans-serif' }}>
                  Status: {status}
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 2 }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 300, color: 'grey.300', fontFamily: '"Exo 2", "Roboto", "Helvetica", "Arial", sans-serif' }}>
                Device ID
              </Typography>
              <IconButton
                size="small"
                onClick={() => setShowClientId(!showClientId)}
                sx={{ 
                  color: '#E0E0E0',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                {showClientId ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </Box>
            <Typography variant="body1" sx={{ 
              fontFamily: '"Roboto Mono", "Courier New", monospace',
              backgroundColor: 'rgba(255,255,255,0.1)',
              p: 1,
              borderRadius: 1
            }}>
              {showClientId ? clientID : maskClientId(clientID)}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" sx={{ fontWeight: 300, mb: 1, color: 'grey.300', fontFamily: '"Exo 2", "Roboto", "Helvetica", "Arial", sans-serif' }}>
              Battery & Signal
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <BatteryIndicator value={batteryLevel} batteryState={batteryState} charging={charging} size="medium" />
              <SignalIndicator value={signalStrength} size="medium" />
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ fontWeight: 300, mb: 2, color: 'grey.300', fontFamily: '"Exo 2", "Roboto", "Helvetica", "Arial", sans-serif' }}>
              Timing Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                  <PlayArrow sx={{ fontSize: '1.2rem' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 400, fontSize: { xs: '0.9rem', sm: '0.95rem' }, fontFamily: '"Exo 2", "Roboto", "Helvetica", "Arial", sans-serif' }}>
                    Startup Time
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ 
                  fontFamily: '"Exo 2", "Roboto Mono", "Courier New", monospace',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  p: 1.25,
                  borderRadius: 1
                }}>
                  {deviceStartTimeInfo?.timestamp ? 
                    (new Date(deviceStartTimeInfo.timestamp) > new Date() ? 'N/A' : 
                    new Date(deviceStartTimeInfo.timestamp).toLocaleString('en-GB', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false
                    })) : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                  <Sync sx={{ fontSize: '1.2rem', animation: 'spin 2s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 400, fontSize: { xs: '0.9rem', sm: '0.95rem' }, fontFamily: '"Exo 2", "Roboto", "Helvetica", "Arial", sans-serif' }}>
                    Last Sync
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ 
                  fontFamily: '"Exo 2", "Roboto Mono", "Courier New", monospace',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  p: 1.25,
                  borderRadius: 1
                }}>
                  {lastTimestamp ? 
                    new Date(lastTimestamp).toLocaleString('en-GB', { hour12: false }) : 
                    'N/A'
                  }
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                  <AccessTime sx={{ fontSize: '1.2rem' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 400, fontSize: { xs: '0.9rem', sm: '0.95rem' }, fontFamily: '"Exo 2", "Roboto", "Helvetica", "Arial", sans-serif' }}>
                    Uptime
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ 
                  fontFamily: '"Exo 2", "Roboto Mono", "Courier New", monospace',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  p: 1.25,
                  borderRadius: 1
                }}>
                  {currentUptimeDisplay}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
          {deviceStartTimeInfo?.startup_data && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 300, mb: 2, color: 'grey.300', fontFamily: '"Exo 2", "Roboto", "Helvetica", "Arial", sans-serif' }}>
                System Information
              </Typography>
              <Grid container spacing={2}>
                {deviceStartTimeInfo.startup_data.firmware_version && (
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                      <Build sx={{ fontSize: '1.2rem' }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 400, fontSize: { xs: '0.9rem', sm: '0.95rem' }, fontFamily: '"Exo 2", "Roboto", "Helvetica", "Arial", sans-serif' }}>
                        Firmware Version
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ 
                      fontFamily: '"Exo 2", "Roboto Mono", "Courier New", monospace',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      p: 1.25,
                      borderRadius: 1
                    }}>
                      {deviceStartTimeInfo.startup_data.firmware_version}
                    </Typography>
                  </Grid>
                )}
                {deviceStartTimeInfo.startup_data.boot_reason && (
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                      <Storage sx={{ fontSize: '1.2rem' }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 300, fontFamily: '"Exo 2", "Roboto", "Helvetica", "Arial", sans-serif' }}>
                        Boot Reason
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ 
                      fontFamily: '"Exo 2", "Roboto Mono", "Courier New", monospace',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      p: 1,
                      borderRadius: 1
                    }}>
                      {deviceStartTimeInfo.startup_data.boot_reason}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: '#E0E0E0' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface DeviceStatusTileProps {
  status?: string;
  onOpenDialog?: () => void;
}

// Tile: Status Only (ONLINE/OFFLINE)
export const DeviceStatusTile: React.FC<DeviceStatusTileProps> = ({ 
  status = 'Offline',
  onOpenDialog = () => {}
}) => {
  const theme = useTheme();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Online":
        return theme.palette.success.main;
      case "Offline":
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  return (
    <Card 
      sx={{ 
        width: '100%',
        height: '100%',
        p: { xs: 0.25, sm: 0.5 },
        cursor: 'pointer',
        borderRadius: 3,
        background: (theme) => theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.9) 0%, rgba(31, 37, 71, 0.95) 50%, rgba(26, 31, 60, 0.9) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 50%, rgba(255, 255, 255, 0.9) 100%)',
        backdropFilter: 'blur(12px)',
        boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 6px 24px rgba(0,0,0,0.35)' : '0 6px 24px rgba(0,0,0,0.08)',
        border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
        color: (theme) => theme.palette.text.primary,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          backgroundColor: getStatusColor(status),
        },
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          transform: 'translateY(-2px)',
          '&::before': {
            backgroundColor: getStatusColor(status),
            opacity: 0.8
          }
        }
      }}
      onClick={onOpenDialog}
    >
      <CardContent sx={{ 
        p: { xs: 0.75, sm: 1 }, 
        '&:last-child': { pb: { xs: 0.75, sm: 1 } },
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Box display="flex" alignItems="center" justifyContent="center">
          {/* Prominent status pill */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.25,
              py: 0.4,
              borderRadius: '999px',
              border: `1px solid ${getStatusColor(status)}AA`,
              backgroundColor: status === 'Online' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)',
              color: getStatusColor(status),
              fontWeight: 700,
              fontSize: { xs: '0.75rem', sm: '0.8rem' },
              letterSpacing: '0.6px',
              textTransform: 'uppercase'
            }}
          >
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: getStatusColor(status) }} />
            {status}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

interface DeviceIdentityTileProps {
  clientID?: string;
  status?: string;
  showClientId?: boolean;
  onToggleClientId?: () => void;
  onOpenDialog?: () => void;
}

// Tile 1: Device Identity & Status
export const DeviceIdentityTile: React.FC<DeviceIdentityTileProps> = ({ 
  clientID = '',
  status = 'Offline',
  showClientId = false,
  onToggleClientId = () => {},
  onOpenDialog = () => {}
}) => {
  const theme = useTheme();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Online":
        return theme.palette.success.main;
      case "Offline":
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  return (
    <Card 
      sx={{ 
        minWidth: 275, 
        mb: { xs: 0.5, sm: 1 }, 
        p: { xs: 0.25, sm: 0.5 },
        cursor: 'pointer',
        borderRadius: 3,
        background: (theme) => theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.9) 0%, rgba(31, 37, 71, 0.95) 50%, rgba(26, 31, 60, 0.9) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 50%, rgba(255, 255, 255, 0.9) 100%)',
        backdropFilter: 'blur(12px)',
        boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 6px 24px rgba(0,0,0,0.35)' : '0 6px 24px rgba(0,0,0,0.08)',
        border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          backgroundColor: getStatusColor(status),
        },
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          transform: 'translateY(-2px)',
          '&::before': {
            backgroundColor: getStatusColor(status),
            opacity: 0.8
          }
        }
      }}
      onClick={onOpenDialog}
    >
      <CardContent sx={{ 
        p: { xs: 0.75, sm: 1 }, 
        '&:last-child': { pb: { xs: 0.75, sm: 1 } }
      }}>
        <Box display="flex" flexDirection="column" gap={{ xs: 0.75, sm: 1 }}>
          {/* Device ID */}
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                fontFamily: '"Exo 2", "Roboto Mono", "Courier New", monospace',
                fontWeight: 300,
                letterSpacing: '0.02em',
                color: '#E0E0E0'
              }}
            >
              ID: {showClientId ? clientID : '••••••••••••'}
            </Typography>
            <IconButton onClick={(e) => { e.stopPropagation(); onToggleClientId(); }} size="small" sx={{ p: { xs: 0.25, sm: 0.5 } }}>
              {showClientId ? <VisibilityOff sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }} /> : <Visibility sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }} />}
            </IconButton>
          </Box>

          {/* Prominent Status Pill */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.25,
              py: 0.35,
              borderRadius: '999px',
              border: `1px solid ${getStatusColor(status)}AA`,
              backgroundColor: status === 'Online' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)',
              color: getStatusColor(status),
              fontWeight: 700,
              fontSize: { xs: '0.75rem', sm: '0.8rem' },
              letterSpacing: '0.6px',
              textTransform: 'uppercase'
            }}
          >
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: getStatusColor(status) }} />
            {status}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

interface DeviceTimingTileProps {
  deviceStartTimeInfo?: DeviceStartTimeInfo | null;
  lastTimestamp?: string | Date | null;
  status?: string;
  onOpenDialog?: () => void;
}

// Tile 2: Timing & System Info
export const DeviceTimingTile: React.FC<DeviceTimingTileProps> = ({ 
  deviceStartTimeInfo = null,
  lastTimestamp = null,
  status = 'Offline',
  onOpenDialog = () => {}
}) => {
  const theme = useTheme();
  const currentUptimeDisplay = useUptime(status, deviceStartTimeInfo);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Online":
        return theme.palette.success.main;
      case "Offline":
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  // Format timestamp to fixed length: "29/10/2025, 14:53:20"
  const formatTimestamp = (timestamp: string | Date | null | undefined) => {
    if (!timestamp) return 'N/A'.padEnd(20, ' ');
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime()) || date > new Date()) return 'N/A'.padEnd(20, ' ');
      return date.toLocaleString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).padEnd(20, ' ');
    } catch {
      return 'N/A'.padEnd(20, ' ');
    }
  };

  // Format uptime to fixed length: "15m 13s"
  const formatUptime = (uptime: string) => {
    if (!uptime || uptime === 'N/A') return 'N/A'.padEnd(10, ' ');
    return uptime.padEnd(10, ' ');
  };

  // Format firmware version to fixed length: "hermes_v2.0.0"
  const formatFirmware = (version?: string) => {
    if (!version) return 'N/A'.padEnd(16, ' ');
    return version.padEnd(16, ' ');
  };

  // Format boot reason to fixed length: "SOFTWARE"
  const formatBootReason = (reason?: string) => {
    if (!reason) return 'N/A'.padEnd(12, ' ');
    return reason.padEnd(12, ' ');
  };

  return (
    <Card 
      sx={{ 
        width: '100%',
        height: '100%',
        p: { xs: 0.25, sm: 0.5 },
        cursor: 'pointer',
        borderRadius: 3,
        background: (theme) => theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.9) 0%, rgba(31, 37, 71, 0.95) 50%, rgba(26, 31, 60, 0.9) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 50%, rgba(255, 255, 255, 0.9) 100%)',
        backdropFilter: 'blur(12px)',
        boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 6px 24px rgba(0,0,0,0.35)' : '0 6px 24px rgba(0,0,0,0.08)',
        border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
        color: (theme) => theme.palette.text.primary,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          backgroundColor: getStatusColor(status),
        },
        '&:hover': {
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          transform: 'translateY(-2px)',
          '&::before': {
            backgroundColor: getStatusColor(status),
            opacity: 0.8
          }
        }
      }}
      onClick={onOpenDialog}
    >
      <CardContent sx={{ 
        p: { xs: 0.75, sm: 1 }, 
        '&:last-child': { pb: { xs: 0.75, sm: 1 } },
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <Box display="flex" flexDirection="column" gap={0}>
          {/* Start Time */}
          <Box display="flex" alignItems="center" gap={0.75}>
            <PlayArrow 
              sx={{ 
                fontSize: { xs: '0.8rem', sm: '0.9rem' },
                color: '#E0E0E0'
              }} 
            />
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: { xs: '0.85rem', sm: '0.9rem' },
                fontFamily: '"Exo 2", "Roboto Mono", "Courier New", monospace',
                fontWeight: 300,
                letterSpacing: '0.02em',
                color: '#E0E0E0',
                whiteSpace: 'pre'
              }}
            >
              {formatTimestamp(deviceStartTimeInfo?.timestamp)}
            </Typography>
          </Box>

          {/* Last Sync */}
          <Box display="flex" alignItems="center" gap={0.75}>
            <Sync 
              sx={{ 
                fontSize: { xs: '0.9rem', sm: '1rem' },
                color: '#E0E0E0',
                animation: 'spin 2s linear infinite',
                '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } }
              }} 
            />
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: { xs: '0.85rem', sm: '0.9rem' },
                fontFamily: '"Exo 2", "Roboto Mono", "Courier New", monospace',
                fontWeight: 300,
                letterSpacing: '0.02em',
                color: '#E0E0E0',
                whiteSpace: 'pre'
              }}
            >
              {formatTimestamp(lastTimestamp)}
            </Typography>
          </Box>

          {/* Uptime */}
          <Box display="flex" alignItems="center" gap={0.75}>
            <AccessTime 
              sx={{ 
                fontSize: { xs: '0.8rem', sm: '0.9rem' },
                color: '#E0E0E0'
              }} 
            />
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: { xs: '0.85rem', sm: '0.9rem' },
                fontFamily: '"Exo 2", "Roboto Mono", "Courier New", monospace',
                fontWeight: 300,
                letterSpacing: '0.02em',
                color: '#E0E0E0',
                whiteSpace: 'pre'
              }}
            >
              {formatUptime(currentUptimeDisplay)}
            </Typography>
          </Box>

          {/* Firmware Version */}
          {deviceStartTimeInfo?.startup_data?.firmware_version && (
            <Box display="flex" alignItems="center" gap={0.75}>
              <Build 
                sx={{ 
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                  color: '#E0E0E0'
                }} 
              />
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: { xs: '0.85rem', sm: '0.9rem' },
                  fontFamily: '"Exo 2", "Roboto Mono", "Courier New", monospace',
                  fontWeight: 300,
                  letterSpacing: '0.02em',
                  color: '#E0E0E0',
                  whiteSpace: 'pre'
                }}
              >
                {formatFirmware(deviceStartTimeInfo.startup_data.firmware_version)}
              </Typography>
            </Box>
          )}

          {/* Boot Reason */}
          {deviceStartTimeInfo?.startup_data?.boot_reason && (
            <Box display="flex" alignItems="center" gap={0.75}>
              <Storage 
                sx={{ 
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                  color: '#E0E0E0'
                }} 
              />
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: { xs: '0.85rem', sm: '0.9rem' },
                  fontFamily: '"Exo 2", "Roboto Mono", "Courier New", monospace',
                  fontWeight: 300,
                  letterSpacing: '0.02em',
                  color: '#E0E0E0',
                  whiteSpace: 'pre'
                }}
              >
                {formatBootReason(deviceStartTimeInfo.startup_data.boot_reason)}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

interface DeviceIndicatorsTileProps {
  batteryLevel?: number;
  signalStrength?: number;
  batteryState?: string;
  charging?: any;
  onOpenDialog?: () => void;
}

// Tile 3: Indicators
export const DeviceIndicatorsTile: React.FC<DeviceIndicatorsTileProps> = ({ 
  batteryLevel = 0,
  signalStrength = 0,
  batteryState = 'idle',
  charging = undefined,
  onOpenDialog = () => {}
}) => {

  return (
    <Card 
      sx={{ 
        width: '100%',
        height: '100%',
        p: { xs: 0.25, sm: 0.5 },
        cursor: 'pointer',
        borderRadius: 3,
        background: (theme) => theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.9) 0%, rgba(31, 37, 71, 0.95) 50%, rgba(26, 31, 60, 0.9) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 50%, rgba(255, 255, 255, 0.9) 100%)',
        backdropFilter: 'blur(12px)',
        boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 6px 24px rgba(0,0,0,0.35)' : '0 6px 24px rgba(0,0,0,0.08)',
        border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
        color: (theme) => theme.palette.text.primary,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #4caf50, #2196f3)',
          transition: 'background 0.3s ease',
        },
        '&:hover': {
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          transform: 'translateY(-2px)',
          '&::before': {
            background: 'linear-gradient(90deg, #5cbf60, #3399f3)',
          }
        }
      }}
      onClick={onOpenDialog}
    >
      <CardContent sx={{ 
        p: { xs: 0.75, sm: 1 }, 
        '&:last-child': { pb: { xs: 0.75, sm: 1 } },
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Indicators - aligned and evenly spaced */}
        <Box
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: { xs: 0.75, sm: 1 },
            width: '100%'
          }}
        >
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <BatteryIndicator value={batteryLevel} batteryState={batteryState} charging={charging} size="small" />
          </Box>
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <SignalIndicator value={signalStrength} size="small" />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

interface DeviceInfoCardProps {
  clientID?: string;
  deviceName?: string;
  deviceType?: string;
  status?: string;
  isLoading?: boolean;
  batteryLevel?: number;
  signalStrength?: number;
  showClientId?: boolean;
  onToggleClientId?: () => void;
  batteryState?: string;
  charging?: any;
  lastTimestamp?: string | Date | null;
  deviceStartTimeInfo?: DeviceStartTimeInfo | null;
}

// Main component that combines all tiles
export default function DeviceInfoCard({ 
  clientID = '',
  deviceName = '',
  deviceType = '',
  status = 'Offline',
  isLoading = false,
  batteryLevel = 0,
  signalStrength = 0,
  showClientId = false,
  onToggleClientId = () => {},
  batteryState = 'idle',
  charging = undefined,
  lastTimestamp = null,
  deviceStartTimeInfo = null
}: DeviceInfoCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const currentUptimeDisplay = useUptime(status, deviceStartTimeInfo);

  return (
    <>
      <Grid container spacing={1} sx={{ alignItems: 'stretch', width: '100%', maxWidth: '100%' }}>
        {/* Left Tile: Timing & System Info */}
        <Grid item xs={7} sx={{ maxWidth: '58.333333%', display: 'flex' }}>
          <DeviceTimingTile
            deviceStartTimeInfo={deviceStartTimeInfo}
            lastTimestamp={lastTimestamp}
            status={status}
            onOpenDialog={() => setDialogOpen(true)}
          />
        </Grid>

        {/* Right Side: Status & Indicators (1x size each, stacked) */}
        <Grid item xs={5} sx={{ maxWidth: '41.666667%', display: 'flex', flexDirection: 'column' }}>
          <Grid container spacing={1} sx={{ flex: 1, alignItems: 'stretch' }}>
            {/* Status Tile - ONLINE/OFFLINE */}
            <Grid item xs={12} sx={{ display: 'flex' }}>
              <DeviceStatusTile
                status={status}
                onOpenDialog={() => setDialogOpen(true)}
              />
            </Grid>
            {/* Indicators Tile */}
            <Grid item xs={12} sx={{ display: 'flex' }}>
              <DeviceIndicatorsTile
                batteryLevel={batteryLevel}
                signalStrength={signalStrength}
                batteryState={batteryState}
                charging={charging}
                onOpenDialog={() => setDialogOpen(true)}
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      <DeviceInfoDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        deviceName={deviceName}
        deviceType={deviceType}
        clientID={clientID}
        status={status}
        batteryLevel={batteryLevel}
        signalStrength={signalStrength}
        batteryState={batteryState}
        charging={charging}
        deviceStartTimeInfo={deviceStartTimeInfo}
        lastTimestamp={lastTimestamp}
        currentUptimeDisplay={currentUptimeDisplay}
      />
    </>
  );
}

