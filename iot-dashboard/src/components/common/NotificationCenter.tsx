// Notification Center Component - View notification history
import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Chip,
  Button,
  Divider,
  Badge,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
} from '@mui/material';
import {
  Close as CloseIcon,
  Notifications as NotificationsIcon,
  CheckCircle,
  Error,
  Warning,
  Info,
  Delete as DeleteIcon,
  MarkEmailRead as MarkReadIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Dashboard as DashboardIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { QueuedNotification, NotificationSeverity, NotificationChannel } from '../../services/NotificationManager';
import notificationManager from '../../services/NotificationManager';
import useNotificationStore from '../../stores/notificationStore';
import { formatDistanceToNow } from 'date-fns';

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
  onAction?: (action: string, notification: QueuedNotification) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ open, onClose, onAction }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearAll,
    preferences,
  } = useNotificationStore();

  // Debug: Log when drawer opens/closes
  useEffect(() => {
    console.log('NotificationCenter open state:', open);
    console.log('NotificationCenter notifications count:', notifications.length);
  }, [open, notifications.length]);

  const [activeTab, setActiveTab] = useState(0);
  const [filterSeverity, setFilterSeverity] = useState<NotificationSeverity | 'all'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterChannel, setFilterChannel] = useState<NotificationChannel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);

  const getSeverityIcon = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'success':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
      case 'warning':
        return <Warning color="warning" />;
      default:
        return <Info color="info" />;
    }
  };

  const getSeverityColor = (severity: NotificationSeverity) => {
    switch (severity) {
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

  const filteredNotifications = notifications.filter((notification) => {
    // Tab filter
    if (activeTab === 1 && notification.read) return false;
    if (activeTab === 2 && !notification.read) return false;

    // Severity filter
    if (filterSeverity !== 'all' && notification.severity !== filterSeverity) return false;

    // Type filter
    if (filterType !== 'all' && notification.type !== filterType) return false;

    // Channel filter
    if (filterChannel !== 'all' && notification.channel !== filterChannel) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !notification.title.toLowerCase().includes(query) &&
        !notification.message.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Don't show dismissed
    if (notification.dismissed) return false;

    return true;
  });

  const unreadNotifications = notifications.filter(n => !n.read && !n.dismissed);
  const readNotifications = notifications.filter(n => n.read && !n.dismissed);

  const KNOWN_TYPES = [
    'alarm',
    'device_status',
    'command',
    'output_change',
    'input_change',
    'subscription_trigger',
    'scheduler_trigger'
  ];

  const uniqueTypes = Array.from(new Set([...KNOWN_TYPES, ...notifications.map(n => n.type)]));
  const uniqueChannels: NotificationChannel[] = ['system', 'alarm', 'subscription', 'device', 'command', 'user', 'scheduler'];

  const formatTypeLabel = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: false, // Better performance
      }}
      PaperProps={{
        sx: {
          width: { xs: 'calc(100vw - 32px)', sm: 400, md: 500 },
          height: { xs: 'calc(100% - 32px)', sm: '100%' },
          margin: { xs: '16px', sm: 0 },
          borderRadius: { xs: '16px', sm: 0 },
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.95) 0%, rgba(31, 37, 71, 0.98) 50%, rgba(26, 31, 60, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.98) 50%, rgba(255, 255, 255, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          zIndex: 1300, // Ensure it's above other content
          border: { xs: `1px solid ${theme.palette.divider}`, sm: 'none' },
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
            <Typography variant="h6">{t('notifications.title')}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {unreadCount > 0 && (
              <Button
                size="small"
                startIcon={<MarkReadIcon />}
                onClick={() => {
                  markAllAsRead();
                  notificationManager.markAllAsRead();
                }}
                sx={{ textTransform: 'none' }}
              >
                {t('notifications.markAllAsRead')}
              </Button>
            )}
            <IconButton size="small" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Filters */}
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <TextField
            fullWidth
            size="small"
            placeholder={t('notifications.title') + '...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 1 }}
          />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>{t('filters.severity')}</InputLabel>
              <Select
                value={filterSeverity}
                onChange={(e: SelectChangeEvent) => setFilterSeverity(e.target.value as NotificationSeverity | 'all')}
                label={t('filters.severity')}
              >
                <MenuItem value="all">{t('filters.all')}</MenuItem>
                <MenuItem value="error">{t('filters.error')}</MenuItem>
                <MenuItem value="warning">{t('filters.warning')}</MenuItem>
                <MenuItem value="info">{t('filters.info')}</MenuItem>
                <MenuItem value="success">{t('filters.success')}</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>{t('filters.type')}</InputLabel>
              <Select
                value={filterType}
                onChange={(e: SelectChangeEvent) => setFilterType(e.target.value)}
                label={t('filters.type')}
              >
                <MenuItem value="all">{t('filters.all')}</MenuItem>
                {uniqueTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {formatTypeLabel(type)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>{t('filters.channel')}</InputLabel>
              <Select
                value={filterChannel}
                onChange={(e: SelectChangeEvent) => setFilterChannel(e.target.value as NotificationChannel | 'all')}
                label={t('filters.channel')}
              >
                <MenuItem value="all">{t('filters.all')}</MenuItem>
                {uniqueChannels.map((channel) => (
                  <MenuItem key={channel} value={channel}>
                    {channel.charAt(0).toUpperCase() + channel.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Filter Carousel (Chips) */}
        <Box
          sx={{
            p: 1.5,
            display: 'flex',
            gap: 1,
            overflowX: 'auto',
            borderBottom: `1px solid ${theme.palette.divider}`,
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE/Edge
          }}
        >
          <Chip
            label={`${t('notifications.all')} ${notifications.length > 0 ? `(${notifications.length})` : ''}`}
            onClick={() => setActiveTab(0)}
            color={activeTab === 0 ? 'primary' : 'default'}
            variant={activeTab === 0 ? 'filled' : 'outlined'}
            clickable
            sx={{ fontWeight: activeTab === 0 ? 600 : 400 }}
          />
          <Badge 
            badgeContent={unreadCount} 
            color="error" 
            sx={{ 
              '& .MuiBadge-badge': { 
                right: 8, 
                top: 4,
                zIndex: 1 
              } 
            }}
          >
            <Chip
              label={t('notifications.unread')}
              onClick={() => setActiveTab(1)}
              color={activeTab === 1 ? 'primary' : 'default'}
              variant={activeTab === 1 ? 'filled' : 'outlined'}
              clickable
              sx={{ fontWeight: activeTab === 1 ? 600 : 400 }}
            />
          </Badge>
          <Chip
            label={`${t('notifications.read')} ${readNotifications.length > 0 ? `(${readNotifications.length})` : ''}`}
            onClick={() => setActiveTab(2)}
            color={activeTab === 2 ? 'primary' : 'default'}
            variant={activeTab === 2 ? 'filled' : 'outlined'}
            clickable
            sx={{ fontWeight: activeTab === 2 ? 600 : 400 }}
          />
        </Box>

        {/* Notification List */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {filteredNotifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <NotificationsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                {t('notifications.noNotifications')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchQuery || filterSeverity !== 'all' || filterType !== 'all' || filterChannel !== 'all'
                  ? t('common.filter')
                  : t('notifications.allCaughtUp')}
              </Typography>
            </Box>
          ) : (
            <List>
              {filteredNotifications.map((notification) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      bgcolor: notification.read
                        ? 'transparent'
                        : theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(0, 0, 0, 0.02)',
                      borderLeft: `3px solid ${getSeverityColor(notification.severity)}`,
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark'
                          ? 'rgba(255, 255, 255, 0.08)'
                          : 'rgba(0, 0, 0, 0.04)',
                      },
                      pr: 1, // Add right padding
                    }}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead(notification.id);
                        // Also update NotificationManager
                        notificationManager.markAsRead(notification.id);
                      }
                    }}
                  >
                    <ListItemIcon sx={{ mt: 0.5 }}>{getSeverityIcon(notification.severity)}</ListItemIcon>
                    <ListItemText
                      sx={{ 
                        mr: 1, // Margin to separate from actions
                        my: 0, // Reset vertical margin
                      }}
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: notification.read ? 400 : 600 }}>
                            {notification.title}
                          </Typography>
                          {notification.groupCount && notification.groupCount > 1 && (
                            <Chip
                              label={`+${notification.groupCount - 1}`}
                              size="small"
                              sx={{ height: 20, fontSize: '0.65rem' }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            component="div"
                            sx={{ 
                              wordBreak: 'break-word', // Prevent overflow
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              mb: 0.5
                            }}
                          >
                            {notification.message}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Typography variant="caption" color="text.secondary" component="span">
                              {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                            </Typography>
                            <Chip
                              label={notification.type}
                              size="small"
                              sx={{ height: 18, fontSize: '0.6rem' }}
                            />
                          </Box>
                        </Box>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                    />
                    
                    {/* Actions Area - Moved from ListItemSecondaryAction */}
                    <Box sx={{ 
                      display: 'flex', 
                      gap: 0.5, 
                      alignItems: 'center',
                      mt: 0.5,
                      flexShrink: 0 // Prevent shrinking
                    }}>
                      {notification.deviceId && (
                        <>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onAction) {
                                onAction('view_device', notification);
                              }
                            }}
                            title={t('notifications.viewDevice')}
                            sx={{ color: 'primary.main' }}
                          >
                            <DashboardIcon fontSize="small" />
                          </IconButton>
                          {(notification.type === 'alarm' || notification.channel === 'alarm') && (
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onAction) {
                                  onAction('view_alarms', notification);
                                }
                              }}
                              title={t('notifications.viewAlarms')}
                              sx={{ color: 'warning.main' }}
                            >
                              <WarningIcon fontSize="small" />
                            </IconButton>
                          )}
                        </>
                      )}
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismiss(notification.id);
                          // Also update NotificationManager
                          notificationManager.dismiss(notification.id);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            p: 2,
            borderTop: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
          </Typography>
          <Button
            size="small"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => {
              if (window.confirm('Clear all notifications?')) {
                clearAll();
                notificationManager.clearAll();
              }
            }}
            sx={{ textTransform: 'none' }}
          >
            Clear All
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default NotificationCenter;

