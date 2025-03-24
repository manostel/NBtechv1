import React from "react";
import { Box, useTheme } from "@mui/material";
import { FaBatteryFull } from "react-icons/fa";

export default function BatteryIndicator({ battery }) {
  const theme = useTheme();
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
      <FaBatteryFull size={16} style={{ color: theme.palette.primary.main }} />
      <Box sx={{ width: 70, height: 6, backgroundColor: "#555", borderRadius: 1, overflow: "hidden" }}>
        <Box sx={{ height: "100%", width: `${battery}%`, backgroundColor: theme.palette.primary.main, transition: "width 0.3s ease" }} />
      </Box>
    </Box>
  );
}
