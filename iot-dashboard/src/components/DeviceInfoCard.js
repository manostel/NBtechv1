import React from "react";
import { Card, CardContent, Typography, Box, CircularProgress, IconButton } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Visibility, VisibilityOff } from '@mui/icons-material';
import BatteryIndicator from "./BatteryIndicator";
import SignalIndicator from "./SignalIndicator";
import PropTypes from 'prop-types';

export default function DeviceInfoCard({ 
  clientID, 
  device, 
  status, 
  lastOnline, 
  isLoading, 
  batteryLevel, 
  signalStrength,
  showClientId,
  onToggleClientId,
  batteryState
}) {
  const theme = useTheme();

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

  return (
    <Card sx={{ mb: 3, bgcolor: theme.palette.background.paper }}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {isLoading ? "Loading..." : device}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="textSecondary">
                ID: {isLoading ? "..." : (showClientId ? clientID : '••••••••••')}
              </Typography>
              <IconButton
                size="small"
                onClick={onToggleClientId}
                sx={{ 
                  color: theme.palette.text.secondary,
                  padding: 0.5
                }}
              >
                {showClientId ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </IconButton>
            </Box>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            {isLoading ? (
              <CircularProgress size={20} />
            ) : (
              <>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      bgcolor: getStatusColor(displayStatus)
                    }}
                  />
                  <Typography variant="subtitle1" color="textSecondary" sx={{ fontWeight: 'medium' }}>
                    {displayStatus}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <BatteryIndicator 
                    value={batteryLevel || 0} 
                    batteryState={batteryState}
                  />
                  <SignalIndicator value={signalStrength || 0} />
                </Box>
              </>
            )}
          </Box>
        </Box>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Last Online: {isLoading ? "..." : lastOnline}
        </Typography>
      </CardContent>
    </Card>
  );
}

DeviceInfoCard.propTypes = {
  clientID: PropTypes.string,
  device: PropTypes.string,
  status: PropTypes.string,
  lastOnline: PropTypes.string,
  isLoading: PropTypes.bool,
  batteryLevel: PropTypes.number,
  signalStrength: PropTypes.number,
  showClientId: PropTypes.bool,
  onToggleClientId: PropTypes.func,
  batteryState: PropTypes.string
};

DeviceInfoCard.defaultProps = {
  clientID: '',
  device: '',
  status: 'Offline',
  lastOnline: 'Never',
  isLoading: false,
  batteryLevel: 0,
  signalStrength: 0,
  showClientId: false,
  onToggleClientId: () => {},
  batteryState: 'idle'
};
