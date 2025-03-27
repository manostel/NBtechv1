import React from "react";
import { Box, useTheme, Typography } from "@mui/material";
import { FaBatteryFull } from "react-icons/fa";

export default function BatteryIndicator({ value }) {
  const theme = useTheme();
  
  // Get battery icon color based on level
  const getBatteryColor = (level) => {
    if (level >= 70) return theme.palette.success.main;
    if (level >= 30) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
      <FaBatteryFull size={16} style={{ color: getBatteryColor(value) }} />
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
