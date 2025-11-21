import React from 'react';
import { Menu, MenuItem, IconButton } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const TimeRangeMenu = ({ timeRange, onTimeRangeChange }) => {
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

  return (
    <>
      <IconButton onClick={handleClick} color="primary">
        <AccessTimeIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={() => handleTimeRangeSelect('1h')}>Last Hour</MenuItem>
        <MenuItem onClick={() => handleTimeRangeSelect('6h')}>Last 6 Hours</MenuItem>
        <MenuItem onClick={() => handleTimeRangeSelect('24h')}>Last 24 Hours</MenuItem>
        <MenuItem onClick={() => handleTimeRangeSelect('7d')}>Last 7 Days</MenuItem>
        <MenuItem onClick={() => handleTimeRangeSelect('30d')}>Last 30 Days</MenuItem>
      </Menu>
    </>
  );
};

export default TimeRangeMenu; 