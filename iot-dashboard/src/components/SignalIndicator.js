import React from "react";
import { Box, useTheme } from "@mui/material";
import { FaSignal } from "react-icons/fa";

export default function SignalIndicator({ signal }) {
  const theme = useTheme();
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
      <FaSignal size={16} style={{ color: "#2196f3" }} />
      <Box sx={{ width: 70, height: 6, backgroundColor: "#555", borderRadius: 1, overflow: "hidden" }}>
        <Box sx={{ height: "100%", width: `${signal}%`, backgroundColor: "#2196f3", transition: "width 0.3s ease" }} />
      </Box>
    </Box>
  );
}
