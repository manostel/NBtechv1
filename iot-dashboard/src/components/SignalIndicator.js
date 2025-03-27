import React from "react";
import { Box, useTheme, Typography } from "@mui/material";
import { FaSignal } from "react-icons/fa";

export default function SignalIndicator({ value }) {
  const theme = useTheme();
  
  // Get signal color based on strength
  const getSignalColor = (strength) => {
    if (strength >= 45) return theme.palette.success.main;  // Green for good signal (45% and above)
    if (strength >= 20) return theme.palette.warning.main;  // Yellow for moderate signal (20-44%)
    return theme.palette.error.main;  // Red for poor signal (below 20%)
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
      <FaSignal size={16} style={{ color: getSignalColor(value) }} />
      <Box sx={{ width: 70, height: 6, backgroundColor: "#555", borderRadius: 1, overflow: "hidden" }}>
        <Box 
          sx={{ 
            height: "100%", 
            width: `${value}%`, 
            backgroundColor: getSignalColor(value), 
            transition: "width 0.3s ease" 
          }} 
        />
      </Box>
      <Typography variant="caption" sx={{ color: getSignalColor(value) }}>
        {value}%
      </Typography>
    </Box>
  );
}
