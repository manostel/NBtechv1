import React from "react";
import { Card, CardContent, Typography, Box, CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";

export default function DeviceInfoCard({ clientID, device, status, lastOnline, isLoading }) {
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
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {isLoading ? "Loading..." : device}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              ID: {isLoading ? "..." : clientID}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {isLoading ? (
              <CircularProgress size={20} />
            ) : (
              <>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: getStatusColor(status),
                    mr: 1,
                  }}
                />
                <Typography variant="body2" color="textSecondary">
                  {status}
                </Typography>
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
