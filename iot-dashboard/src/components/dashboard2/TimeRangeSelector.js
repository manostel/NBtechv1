import React from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, Chip } from '@mui/material';
import { AccessTime as AccessTimeIcon } from '@mui/icons-material';

const timeRanges = [
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '6h', label: '6h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' }
];

const TimeRangeSelector = ({ timeRange, onTimeRangeChange }) => {
  return (
    <Box sx={{ minWidth: 120 }}>
      <FormControl fullWidth size="small">
        <InputLabel id="time-range-select-label">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTimeIcon fontSize="small" />
            Time
          </Box>
        </InputLabel>
        <Select
          labelId="time-range-select-label"
          value={timeRange || '15m'}
          label="Time"
          onChange={onTimeRangeChange}
          size="small"
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              <Chip
                key={selected}
                label={timeRanges.find(range => range.value === selected)?.label}
                size="small"
              />
            </Box>
          )}
        >
          {timeRanges.map((range) => (
            <MenuItem key={range.value} value={range.value}>
              {range.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default TimeRangeSelector; 