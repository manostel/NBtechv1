import React from "react";
import { Box, useTheme, Typography } from "@mui/material";
import { FaBatteryFull, FaBolt, FaArrowUp, FaArrowDown, FaPause } from "react-icons/fa";
import { HelpOutline } from "@mui/icons-material";

export default function BatteryIndicator({ value, isCharging, batteryState, charging }) {
  const theme = useTheme();
  
  // Get battery icon color based on level
  const getBatteryColor = (level) => {
    if (level >= 70) return theme.palette.success.main;
    if (level >= 30) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  // Get state icon based on charging status (1 = charging, 0 = not charging)
  const getStateIcon = () => {
    // Only use charging field from API (1 or 0)
    if (charging === 1) {
      return <FaBolt size={12} style={{ color: theme.palette.success.main }} />;
    } else if (charging === 0) {
      return <FaArrowDown size={12} style={{ color: theme.palette.error.main }} />;
    } else {
      // Any other value (undefined, null, etc.) - show question mark
      return <HelpOutline sx={{ fontSize: 12, color: theme.palette.text.secondary }} />;
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, height: 20 }}>
        <FaBatteryFull size={16} style={{ color: getBatteryColor(value) }} />
        {batteryState && (
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            backgroundColor: theme.palette.background.paper,
            borderRadius: '50%',
            border: `1px solid ${theme.palette.divider}`
          }}>
            {getStateIcon()}
          </Box>
        )}
      </Box>
      <Box sx={{ width: 70, height: 6, backgroundColor: "#555", borderRadius: 1, overflow: "hidden" }}>
        <Box 
          sx={{ 
            height: "100%", 
            width: `${value}%`, 
            backgroundColor: getBatteryColor(value), 
            transition: "width 0.3s ease" 
          }} 
        />
      </Box>
      <Typography variant="caption" sx={{ color: getBatteryColor(value) }}>
        {value}%
      </Typography>
    </Box>
  );
}
