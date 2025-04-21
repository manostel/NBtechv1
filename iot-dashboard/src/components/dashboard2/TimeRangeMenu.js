import React, { useState } from "react";
import { Button, Menu, MenuItem } from "@mui/material";
import { ArrowDropDown as ArrowDropDownIcon } from '@mui/icons-material';

const TimeRangeMenu = ({ timeRange, setTimeRange, timeRanges }) => {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleTimeRangeChange = (newTimeRange) => {
    setTimeRange(newTimeRange);
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
      <Button
        variant="outlined"
        onClick={handleClick}
        endIcon={<ArrowDropDownIcon />}
      >
        {timeRange === 'live' ? 'Live' : getTimeRangeLabel(timeRange)}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {timeRanges.map((range) => (
          <MenuItem
            key={range.value}
            onClick={() => handleTimeRangeChange(range.value)}
          >
            {range.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default TimeRangeMenu; 