import React from 'react';
import { Menu, MenuItem, IconButton, Tooltip } from '@mui/material';
import { AccessTime as AccessTimeIcon } from '@mui/icons-material';

export default function TimeRangeMenu({ timeRange, onTimeRangeChange, timeRanges }) {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleTimeRangeSelect = (range) => {
    onTimeRangeChange(range);
    handleClose();
  };

  const getTimeRangeLabel = (range) => {
    if (typeof range === 'object' && range.label) {
      return range.label;
    }
    if (range === 'live') return 'Live';
    if (typeof range === 'string') {
      if (range.endsWith('m')) return `${range.replace('m', '')} min`;
      if (range.endsWith('h')) return `${range.replace('h', '')} hour${range.replace('h', '') > 1 ? 's' : ''}`;
      if (range.endsWith('d')) return `${range.replace('d', '')} day${range.replace('d', '') > 1 ? 's' : ''}`;
    }
    return range;
  };

  return (
    <>
      <Tooltip title="Select time range">
        <IconButton
          onClick={handleClick}
          sx={{ 
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': {
              bgcolor: 'primary.dark'
            }
          }}
        >
          <AccessTimeIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {timeRanges.map((range) => (
          <MenuItem
            key={range.value}
            onClick={() => handleTimeRangeSelect(range.value)}
            selected={timeRange === range.value}
          >
            {range.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
} 