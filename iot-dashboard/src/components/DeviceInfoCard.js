import React from "react";
import { Card, CardContent, Typography, Box, CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import BatteryIndicator from "./BatteryIndicator";
import SignalIndicator from "./SignalIndicator";

export default function DeviceInfoCard({ clientID, device, status, lastOnline, isLoading, batteryLevel, signalStrength }) {
  const theme = useTheme();

  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return theme.palette.success.main;
      case "Inactive":
        return theme.palette.error.main;
      case "Error":
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  return (
    <Card sx={{ mb: 3, bgcolor: theme.palette.background.paper }}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {isLoading ? "Loading..." : device}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              ID: {isLoading ? "..." : clientID}
            </Typography>
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
                      bgcolor: getStatusColor(status),
                    }}
                  />
                  <Typography variant="subtitle1" color="textSecondary" sx={{ fontWeight: 'medium' }}>
                    {status}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <BatteryIndicator value={batteryLevel || 0} />
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
