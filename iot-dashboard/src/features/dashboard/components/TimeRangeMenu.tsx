import React from 'react';
import { Menu, MenuItem, IconButton } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

interface TimeRangeMenuProps {
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
}

const TimeRangeMenu: React.FC<TimeRangeMenuProps> = ({ timeRange, onTimeRangeChange }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleTimeRangeSelect = (range: string) => {
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

