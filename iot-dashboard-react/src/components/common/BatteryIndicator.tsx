import React from "react";
import { Box, useTheme, Typography } from "@mui/material";
import { FaBatteryFull, FaBolt } from "react-icons/fa";

interface BatteryIndicatorProps {
  value: number;
  isCharging?: boolean;
  batteryState?: string;
  charging?: number;
}

const BatteryIndicator: React.FC<BatteryIndicatorProps> = ({ value, isCharging, batteryState, charging }) => {
  const theme = useTheme();
  
  // Get battery icon color based on level
  const getBatteryColor = (level: number): string => {
    if (level >= 70) return theme.palette.success.main;
    if (level >= 30) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  // Only show a state icon when charging; otherwise no icon
  const getStateIcon = (): JSX.Element | null => {
    if (charging === 1) {
      return <FaBolt size={12} style={{ color: theme.palette.success.main }} />;
    }
    return null;
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, height: 20 }}>
        <FaBatteryFull size={16} style={{ color: getBatteryColor(value) }} />
        {charging === 1 && (
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
};

export default BatteryIndicator;


