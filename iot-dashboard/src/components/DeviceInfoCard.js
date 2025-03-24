import React from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";
import { FaCircle } from "react-icons/fa";

export default function DeviceInfoCard({ clientID, device, status, lastOnline }) {
  const statusColor = status === "Active" ? "#4caf50" : "#f44336";
  return (
    <Card sx={{ bgcolor: "background.paper", color: "text.primary", maxWidth: 400, mx: "auto", mb: 2 }}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
            Client ID:
          </Typography>
          <Typography variant="subtitle1">{clientID}</Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
            Device:
          </Typography>
          <Typography variant="subtitle1">{device}</Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1, alignItems: "center" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
            Status:
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <FaCircle style={{ color: statusColor, marginRight: 4 }} />
            <Typography variant="subtitle1">{status === "Active" ? "Online" : "Offline"}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
            Last Online:
          </Typography>
          <Typography variant="subtitle1">{lastOnline}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
