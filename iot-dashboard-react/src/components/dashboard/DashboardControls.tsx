import React from "react";
import { Paper, Box } from "@mui/material";
import { 
  ShowChart as ShowChartIcon,
  Settings as SettingsIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import TimeRangeMenu from "./TimeRangeMenu";
import { ScrollMenu } from 'react-horizontal-scrolling-menu';
// react-horizontal-scrolling-menu CSS moved to _app.tsx

const TIME_RANGES = [
  { value: 'live', label: 'Live' },
  { value: '15m', label: '15 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '2h', label: '2 Hours' },
  { value: '4h', label: '4 Hours' },
  { value: '8h', label: '8 Hours' },
  { value: '16h', label: '16 Hours' },
  { value: '24h', label: '24 Hours' },
  { value: '3d', label: '3 Days' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' }
];

interface DashboardControlsProps {
  tabValue: number;
  setTabValue: (value: number) => void;
  timeRange: string;
  setTimeRange: (value: string) => void;
}

export default function DashboardControls({ 
  tabValue, 
  setTabValue, 
  timeRange, 
  setTimeRange 
}: DashboardControlsProps) {
  const handleTimeRangeChange = (newTimeRange: string) => {
    setTimeRange(newTimeRange);
  };

  const tabs = [
    { label: 'Overview', icon: <ShowChartIcon />, value: 0 },
    { label: 'Commands', icon: <SettingsIcon />, value: 1 },
    { label: 'History', icon: <HistoryIcon />, value: 2 },
  ];

  return (
    <>
      <Paper sx={{ 
        p: 1.5,
        mb: 2,
        bgcolor: 'background.paper',
        pl: 0,
        ml: 0,
        '& .MuiButton-root': {
          minHeight: 28,
          minWidth: 'auto'
        }
      }}>
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 1,
          alignItems: 'center',
          pl: 0,
          ml: 0
        }}>
          <TimeRangeMenu
            timeRange={timeRange}
            setTimeRange={handleTimeRangeChange}
            timeRanges={TIME_RANGES}
          />
        </Box>
      </Paper>

      <Box sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', minWidth: 0, pl: 0, ml: 0 }}>
        <ScrollMenu>
          {tabs.map((tab) => (
            <Box
              key={tab.value}
              onClick={() => setTabValue(tab.value)}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: 2,
                py: 1,
                cursor: 'pointer',
                fontWeight: tabValue === tab.value ? 'bold' : 400,
                fontSize: '1rem',
                color: tabValue === tab.value ? 'primary.main' : 'text.primary',
                borderBottom: tabValue === tab.value ? '3px solid' : '3px solid transparent',
                borderColor: tabValue === tab.value ? 'primary.main' : 'transparent',
                backgroundColor: 'transparent',
                transition: 'all 0.2s',
                minWidth: 120,
                mr: 1,
                borderRadius: 2,
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              {tab.icon}
              <span style={{ marginLeft: 8 }}>{tab.label}</span>
            </Box>
          ))}
        </ScrollMenu>
      </Box>
    </>
  );
} 