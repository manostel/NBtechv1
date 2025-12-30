// Notification Toast Component - In-app toast notifications
import React, { useEffect, useState } from 'react';
import { Snackbar, Alert, AlertTitle, IconButton, Box, Button, Stack } from '@mui/material';
import { Close as CloseIcon, CheckCircle, Error, Warning, Info } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { QueuedNotification } from '../../services/NotificationManager';
import useNotificationStore from '../../stores/notificationStore';

interface NotificationToastProps {
  notification: QueuedNotification;
  onClose: () => void;
  onAction?: (action: string, notification: QueuedNotification) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onClose,
  onAction,
}) => {
  const theme = useTheme();
  const [open, setOpen] = useState(true);

  const getSeverityIcon = () => {
    switch (notification.severity) {
      case 'success':
        return <CheckCircle />;
      case 'error':
        return <Error />;
      case 'warning':
        return <Warning />;
      default:
        return <Info />;
    }
  };

  const getSeverityColor = () => {
    switch (notification.severity) {
      case 'success':
        return theme.palette.success.main;
      case 'error':
        return theme.palette.error.main;
      case 'warning':
        return theme.palette.warning.main;
      default:
        return theme.palette.info.main;
    }
  };

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
    setTimeout(onClose, 300); // Wait for animation
  };

  const handleAction = (action: string) => {
    if (onAction) {
      onAction(action, notification);
    }
    if (action === 'dismiss') {
      handleClose();
    }
  };

  // Auto-dismiss if duration is set
  useEffect(() => {
    if (notification.duration && notification.duration > 0 && !notification.persistent) {
      const timer = setTimeout(() => {
        handleClose();
      }, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification.duration, notification.persistent]);

  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      onClose={handleClose}
      sx={{
        '& .MuiSnackbarContent-root': {
          minWidth: '300px',
          maxWidth: '500px',
        },
      }}
    >
      <Alert
        severity={notification.severity}
        icon={getSeverityIcon()}
        onClose={handleClose}
        sx={{
          width: '100%',
          boxShadow: theme.shadows[8],
          '& .MuiAlert-icon': {
            color: getSeverityColor(),
          },
        }}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {notification.actions && notification.actions.length > 0 && (
              <Stack direction="row" spacing={0.5}>
                {notification.actions.map((action, index) => (
                  <Button
                    key={index}
                    size="small"
                    variant={action.variant === 'primary' ? 'contained' : 'text'}
                    color={action.variant === 'error' ? 'error' : 'inherit'}
                    onClick={() => handleAction(action.action)}
                    sx={{ minWidth: 'auto', px: 1 }}
                  >
                    {action.label}
                  </Button>
                ))}
              </Stack>
            )}
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={handleClose}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        }
      >
        <AlertTitle sx={{ fontWeight: 600, mb: 0.5 }}>
          {notification.title}
        </AlertTitle>
        {notification.message}
        {notification.groupCount && notification.groupCount > 1 && (
          <Box sx={{ mt: 0.5, fontSize: '0.75rem', opacity: 0.8 }}>
            {notification.groupCount} similar notifications
          </Box>
        )}
      </Alert>
    </Snackbar>
  );
};

export default NotificationToast;

