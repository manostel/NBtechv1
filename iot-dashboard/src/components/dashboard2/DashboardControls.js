import React from "react";
import { Paper, Box, Tabs, Tab } from "@mui/material";
import { 
  ShowChart as ShowChartIcon,
  Settings as SettingsIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import TimeRangeMenu from "./TimeRangeMenu";

const TIME_RANGES = [
  { value: 'live', label: 'Live' },
  { value: '15m', label: '15 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '2h', label: '2 Hours' },
  { value: '4h', label: '4 Hours' },
  { value: '8h', label: '8 Hours' },
  { value: '16h', label: '16 Hours' },
  { value: '24h', label: '24 Hours' }
];

export default function DashboardControls({ 
  tabValue, 
  setTabValue, 
  timeRange, 
  setTimeRange 
}) {
  const handleTimeRangeChange = (newTimeRange) => {
    setTimeRange(newTimeRange);
  };

  return (
    <>
      <Paper sx={{ 
        p: 1.5,
        mb: 2,
        bgcolor: 'background.paper',
        '& .MuiButton-root': {
          minHeight: 28,
          minWidth: 'auto'
        }
      }}>
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 1,
          alignItems: 'center' 
        }}>
          <TimeRangeMenu
            timeRange={timeRange}
            setTimeRange={handleTimeRangeChange}
            timeRanges={TIME_RANGES}
          />
        </Box>
      </Paper>

      <Tabs
        value={tabValue}
        onChange={(e, newValue) => setTabValue(newValue)}
        sx={{ 
          mb: 3,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 'bold',
            fontSize: '1rem',
            minWidth: 120,
            '&.Mui-selected': {
              color: 'primary.main',
            }
          }
        }}
      >
        <Tab 
          label="Overview" 
          icon={<ShowChartIcon />} 
          iconPosition="start" 
        />
        <Tab 
          label="Commands" 
          icon={<SettingsIcon />} 
          iconPosition="start" 
        />
        <Tab 
          label="History" 
          icon={<HistoryIcon />} 
          iconPosition="start" 
        />
      </Tabs>
    </>
  );
} 