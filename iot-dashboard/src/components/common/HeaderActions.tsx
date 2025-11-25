// Header Actions Component - Groups header icons into a clean menu
import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Badge,
  Divider,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import useNotificationStore from '../../stores/notificationStore';

interface HeaderActionsProps {
  onRefresh?: () => void;
  onNotifications?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
  showBack?: boolean;
  onBack?: () => void;
  showRefresh?: boolean;
  showNotifications?: boolean;
  showSettings?: boolean;
  showLogout?: boolean;
}

const HeaderActions: React.FC<HeaderActionsProps> = ({
  onRefresh,
  onNotifications,
  onSettings,
  onLogout,
  showBack = false,
  onBack,
  showRefresh = true,
  showNotifications = true,
  showSettings = true,
  showLogout = true,
}) => {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { unreadCount } = useNotificationStore();
  const open = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (action: () => void) => {
    action();
    handleMenuClose();
  };

  // Count how many items will be in the menu
  const menuItemsCount = [showSettings, showLogout].filter(Boolean).length;
  const hasMenuItems = menuItemsCount > 0;

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {/* Refresh - Always visible if enabled */}
        {showRefresh && onRefresh && (
          <Tooltip title={t('header.refresh')}>
            <IconButton
              edge="end"
              color="inherit"
              aria-label={t('header.refresh')}
              onClick={onRefresh}
              sx={{
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transform: 'scale(1.05)',
                },
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        )}

        {/* Notifications - Always visible if enabled */}
        {showNotifications && onNotifications && (
          <Tooltip title={t('header.notifications')}>
            <IconButton
              edge="end"
              color="inherit"
              aria-label={t('header.notifications')}
              onClick={onNotifications}
              sx={{
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transform: 'scale(1.05)',
                },
              }}
            >
              <Badge badgeContent={unreadCount} color="error" max={99}>
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
        )}

        {/* More Menu - Groups Settings and Logout */}
        {hasMenuItems && (
          <Tooltip title={t('header.moreOptions')}>
            <IconButton
              edge="end"
              color="inherit"
              aria-label={t('header.moreOptions')}
              aria-controls={open ? 'header-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
              onClick={handleMenuClick}
              sx={{
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transform: 'scale(1.05)',
                },
              }}
            >
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* More Menu */}
      <Menu
        id="header-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        MenuListProps={{
          'aria-labelledby': 'more-button',
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            mt: 1.5,
            minWidth: 180,
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          },
        }}
      >
        {showSettings && onSettings && (
          <MenuItem onClick={() => handleMenuItemClick(onSettings)}>
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('header.settings')}</ListItemText>
          </MenuItem>
        )}
        {showSettings && showLogout && <Divider />}
        {showLogout && onLogout && (
          <MenuItem onClick={() => handleMenuItemClick(onLogout)}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('header.logout')}</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default HeaderActions;

