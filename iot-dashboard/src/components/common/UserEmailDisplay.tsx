// User Email Display Component - Professional user email display for headers
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Tooltip,
  useTheme,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface UserEmailDisplayProps {
  email: string;
  variant?: 'icon' | 'chip' | 'full' | 'compact';
  showIcon?: boolean;
  showMenu?: boolean;
}

const UserEmailDisplay: React.FC<UserEmailDisplayProps> = ({
  email,
  variant = 'chip',
  showIcon = true,
  showMenu = true,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  
  // Get initials from email
  const getInitials = (email: string) => {
    const parts = email.split('@')[0].split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  // Get color based on email hash for consistent avatar color
  const getAvatarColor = (email: string) => {
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      '#4caf50',
      '#ff9800',
      '#9c27b0',
      '#f44336',
    ];
    const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const initials = getInitials(email);
  const avatarColor = getAvatarColor(email);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (showMenu) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(email);
    handleClose();
  };

  // Avatar component with menu functionality
  const AvatarWithMenu: React.FC<{ size: number; fontSize: string }> = ({ size, fontSize }) => (
    <>
      <Avatar
        onClick={showMenu ? handleClick : undefined}
        sx={{
          width: size,
          height: size,
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #4caf50, #2196f3)'
            : 'linear-gradient(135deg, #388e3c, #1976d2)',
          fontSize: fontSize,
          fontWeight: 600,
          cursor: showMenu ? 'pointer' : 'default',
          border: `2px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
          transition: 'all 0.3s ease',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 2px 8px rgba(0,0,0,0.3)'
            : '0 2px 8px rgba(0,0,0,0.1)',
          color: '#fff',
          '&:hover': showMenu ? {
            transform: 'scale(1.05)',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 4px 12px rgba(76, 175, 80, 0.5)'
              : '0 4px 12px rgba(56, 142, 60, 0.5)',
          } : {},
        }}
      >
        {initials}
      </Avatar>
      {showMenu && (
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          onClick={handleClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            sx: {
              mt: 1.5,
              minWidth: 280,
              maxWidth: 320,
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            },
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Signed in as
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, #4caf50, #2196f3)'
                    : 'linear-gradient(135deg, #388e3c, #1976d2)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: '#fff',
                }}
              >
                {initials}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
                  {email.split('@')[0]}
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ 
                    wordBreak: 'break-all',
                    display: 'block',
                  }}
                >
                  {email}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Divider />
          <MenuItem onClick={handleCopyEmail}>
            <ListItemIcon>
              <EmailIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Copy Email" secondary="Copy to clipboard" />
          </MenuItem>
          <MenuItem>
            <ListItemIcon>
              <CheckCircleIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="Account Status" 
              secondary="Active" 
            />
          </MenuItem>
        </Menu>
      )}
    </>
  );

  // Icon variant - just icon with tooltip and menu, matches theme with green-blue gradient
  if (variant === 'icon') {
    return (
      <Tooltip title={showMenu ? "Click to view account" : email} arrow>
        <Box>
          <AvatarWithMenu size={36} fontSize="0.875rem" />
        </Box>
      </Tooltip>
    );
  }

  // Chip variant - compact with icon, matches device type badge styling with green-blue gradient
  if (variant === 'chip') {
    return (
      <>
        <Box
          onClick={showMenu ? handleClick : undefined}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.5,
            py: 0.5,
            borderRadius: 2,
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(255,255,255,0.05)' 
              : 'rgba(0,0,0,0.05)',
            border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            cursor: showMenu ? 'pointer' : 'default',
            transition: 'all 0.3s ease',
            '&:hover': showMenu ? {
              backgroundColor: theme.palette.mode === 'dark' 
                ? 'rgba(255,255,255,0.08)' 
                : 'rgba(0,0,0,0.08)',
            } : {},
          }}
        >
          <Avatar
            sx={{
              width: 20,
              height: 20,
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #4caf50, #2196f3)'
                : 'linear-gradient(135deg, #388e3c, #1976d2)',
              fontSize: '0.7rem',
              fontWeight: 600,
              color: '#fff',
            }}
          >
            {initials}
          </Avatar>
          <Typography
            variant="subtitle2"
            sx={{
              color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
              fontWeight: 500,
              maxWidth: { xs: 100, sm: 150 },
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {email.split('@')[0]}
          </Typography>
        </Box>
        {showMenu && (
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            onClick={handleClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              sx: {
                mt: 1.5,
                minWidth: 280,
                maxWidth: 320,
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {t('user.signedInAs')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    background: theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, #4caf50, #2196f3)'
                      : 'linear-gradient(135deg, #388e3c, #1976d2)',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: '#fff',
                  }}
                >
                  {initials}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
                    {email.split('@')[0]}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ 
                      wordBreak: 'break-all',
                      display: 'block',
                    }}
                  >
                    {email}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Divider />
            <MenuItem onClick={handleCopyEmail}>
              <ListItemIcon>
                <EmailIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={t('user.copyEmail')} secondary={t('user.copyToClipboard')} />
            </MenuItem>
            <MenuItem>
              <ListItemIcon>
                <CheckCircleIcon fontSize="small" color="success" />
              </ListItemIcon>
              <ListItemText 
                primary={t('user.accountStatus')} 
                secondary={t('user.active')} 
              />
            </MenuItem>
          </Menu>
        )}
      </>
    );
  }

  // Compact variant - just email with icon
  if (variant === 'compact') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 0.5,
          borderRadius: 2,
          bgcolor: theme.palette.mode === 'dark'
            ? 'rgba(255,255,255,0.05)'
            : 'rgba(0,0,0,0.05)',
          border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        }}
      >
        <Avatar
          sx={{
            width: 24,
            height: 24,
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #4caf50, #2196f3)'
              : 'linear-gradient(135deg, #388e3c, #1976d2)',
            fontSize: '0.7rem',
            fontWeight: 600,
            color: '#fff',
          }}
        >
          {initials}
        </Avatar>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 500,
            maxWidth: { xs: 80, sm: 120 },
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
          }}
        >
          {email.split('@')[0]}
        </Typography>
      </Box>
    );
  }

  // Full variant - email with icon and full text
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1,
        borderRadius: 2,
        bgcolor: theme.palette.mode === 'dark'
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(0,0,0,0.05)',
        border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
      }}
    >
      {showIcon && (
        <Avatar
          sx={{
            width: 32,
            height: 32,
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #4caf50, #2196f3)'
              : 'linear-gradient(135deg, #388e3c, #1976d2)',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#fff',
          }}
        >
          {initials}
        </Avatar>
      )}
      <Box>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
            fontSize: '0.65rem',
          }}
        >
          Signed in as
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            maxWidth: { xs: 120, sm: 200 },
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)',
          }}
        >
          {email}
        </Typography>
      </Box>
    </Box>
  );
};

export default UserEmailDisplay;

