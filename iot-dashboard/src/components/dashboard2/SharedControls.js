import React from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material';
import VariableSelector from './VariableSelector';

const TIME_RANGES = [
  { value: 'live', label: 'Live' },
  { value: '15m', label: 'Last 15 minutes' },
  { value: '1h', label: 'Last 1 hour' },
  { value: '2h', label: 'Last 2 hours' },
  { value: '4h', label: 'Last 4 hours' },
  { value: '8h', label: 'Last 8 hours' },
  { value: '16h', label: 'Last 16 hours' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '3d', label: 'Last 3 days' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' }
];

const SharedControls = ({
  selectedVariables,
  availableVariables,
  onVariableChange,
  timeRange,
  onTimeRangeChange,
  onApply,
  isOverview = false
}) => {
  // Don't render anything for the overview tab as it uses the latest data API
  if (isOverview) {
    return null;
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 2,
      '& > *': { height: '40px' } // Ensure consistent height for all elements
    }}>
      <Box sx={{ minWidth: 200, flex: 1 }}>
        <VariableSelector
          variables={availableVariables}
          selectedVariables={selectedVariables}
          onVariableChange={onVariableChange}
          label="Chart Variables"
        />
      </Box>
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Time Range</InputLabel>
        <Select
          value={timeRange}
          onChange={(e) => onTimeRangeChange(e.target.value)}
          label="Time Range"
          size="small"
        >
          {TIME_RANGES.map((range) => (
            <MenuItem key={range.value} value={range.value}>
              {range.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button
        variant="contained"
        color="primary"
        onClick={onApply}
        disabled={selectedVariables.length === 0}
        size="small"
        sx={{ 
          minWidth: 100,
          height: '40px' // Match height with other elements
        }}
      >
        Apply
      </Button>
    </Box>
  );
};

export default SharedControls; 