import React from 'react';
import { Box, Grid, Typography, Select, MenuItem, FormControl, InputLabel, Button } from '@mui/material';
import VariableSelector from './VariableSelector';

const TIME_RANGES = [
  { value: 'live', label: 'Live' },
  { value: '15m', label: 'Last 15 minutes' },
  { value: '1h', label: 'Last 1 hour' },
  { value: '2h', label: 'Last 2 hours' },
  { value: '4h', label: 'Last 4 hours' },
  { value: '8h', label: 'Last 8 hours' },
  { value: '16h', label: 'Last 16 hours' },
  { value: '24h', label: 'Last 24 hours' }
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
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <VariableSelector
            variables={availableVariables}
            selectedVariables={selectedVariables}
            onVariableChange={onVariableChange}
            label="Chart Variables"
          />
        </Box>
        <FormControl size="small" sx={{ minWidth: 120 }}>
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
          sx={{ minWidth: 100 }}
        >
          Apply
        </Button>
      </Box>
    </Box>
  );
};

export default SharedControls; 