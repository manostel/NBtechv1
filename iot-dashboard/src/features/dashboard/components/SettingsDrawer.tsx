import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Select,
  MenuItem,
  Slider,
  Button,
  useTheme,
  alpha,
  TextField,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MonitorIcon from '@mui/icons-material/Monitor';
import StorageIcon from '@mui/icons-material/Storage';
import LanguageIcon from '@mui/icons-material/Language';
import SpeedIcon from '@mui/icons-material/Speed';
import BatteryStdIcon from '@mui/icons-material/BatteryStd';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import AnimationIcon from '@mui/icons-material/Animation';
import ViewCompactIcon from '@mui/icons-material/ViewCompact';
import GridOnIcon from '@mui/icons-material/GridOn';
import TimelineIcon from '@mui/icons-material/Timeline';
import WarningIcon from '@mui/icons-material/Warning';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import InfoIcon from '@mui/icons-material/Info';
import { useTranslation } from 'react-i18next';
import useNotificationStore from '../../../stores/notificationStore';

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  onToggleTheme: () => void;
  isDarkMode: boolean;
}

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  open,
  onClose,
  onToggleTheme,
  isDarkMode,
}) => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { preferences, updatePreferences } = useNotificationStore();

  // Local state for some settings not yet in store
  const [showBatterySignal, setShowBatterySignal] = React.useState(true);
  const [showClientId, setShowClientId] = React.useState(true);
  const [reduceMotion, setReduceMotion] = React.useState(false);
  const [compactUI, setCompactUI] = React.useState(false);
  const [refreshInterval, setRefreshInterval] = React.useState(30);
  const [defaultTimeRange, setDefaultTimeRange] = React.useState('1h');
  const [showDataPoints, setShowDataPoints] = React.useState(true);
  const [showGrid, setShowGrid] = React.useState(true);
  const [batteryAlertThreshold, setBatteryAlertThreshold] = React.useState(20);
  const [signalAlertThreshold, setSignalAlertThreshold] = React.useState(30);

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  const handleExportSettings = () => {
    const settings = {
      preferences,
      display: {
        showBatterySignal,
        showClientId,
        reduceMotion,
        compactUI,
        refreshInterval,
        defaultTimeRange,
        showDataPoints,
        showGrid,
        batteryAlertThreshold,
        signalAlertThreshold,
      }
    };
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dashboard-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const settings = JSON.parse(e.target?.result as string);
            if (settings.preferences) updatePreferences(settings.preferences);
            if (settings.display) {
              setShowBatterySignal(settings.display.showBatterySignal);
              setShowClientId(settings.display.showClientId);
              setReduceMotion(settings.display.reduceMotion);
              setCompactUI(settings.display.compactUI);
              setRefreshInterval(settings.display.refreshInterval);
              setDefaultTimeRange(settings.display.defaultTimeRange);
              setShowDataPoints(settings.display.showDataPoints);
              setShowGrid(settings.display.showGrid);
              setBatteryAlertThreshold(settings.display.batteryAlertThreshold);
              setSignalAlertThreshold(settings.display.signalAlertThreshold);
            }
          } catch (error) {
            console.error('Error importing settings:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };
  
  const handleRefreshIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 10 && val <= 600) {
      setRefreshInterval(val);
    }
  };

  const handleDefaultTimeRange = (e: any) => {
    setDefaultTimeRange(e.target.value);
  };

  const SettingSection = ({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, px: 2 }}>
        <Box sx={{ 
          mr: 1.5, 
          color: 'primary.main',
          display: 'flex',
          alignItems: 'center'
        }}>
          {icon}
        </Box>
        <Typography variant="subtitle2" color="primary" fontWeight={600}>
          {title}
        </Typography>
      </Box>
      <List disablePadding>
        {children}
      </List>
      <Divider sx={{ mt: 2 }} />
    </Box>
  );

  const SettingItem = ({ 
    label, 
    description, 
    action, 
    icon 
  }: { 
    label: string, 
    description?: string, 
    action: React.ReactNode,
    icon?: React.ReactNode 
  }) => (
    <ListItem sx={{ py: 1 }}>
      {icon && (
        <ListItemIcon sx={{ minWidth: 40 }}>
          {icon}
        </ListItemIcon>
      )}
      <ListItemText 
        primary={label} 
        secondary={description}
        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
        secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
      />
      <ListItemSecondaryAction>
        {action}
      </ListItemSecondaryAction>
    </ListItem>
  );

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 320,
          background: theme.palette.mode === 'dark' 
            ? alpha(theme.palette.background.paper, 0.95)
            : alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(10px)',
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" fontWeight={600}>
          {t('settings.title')}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ overflowY: 'auto', height: '100%', pb: 4 }}>
        
        {/* Appearance */}
        <Box sx={{ p: 2 }}>
          <SettingSection title={t('settings.appearance')} icon={<DarkModeIcon />}>
            <SettingItem
              label={t('settings.theme')}
              description={isDarkMode ? t('settings.darkMode') : t('settings.lightMode')}
              action={
                <Switch checked={isDarkMode} onChange={onToggleTheme} size="small" />
              }
            />
            <SettingItem
              label={t('settings.language')}
              description={i18n.language === 'el' ? 'Ελληνικά' : 'English'}
              icon={<LanguageIcon fontSize="small" color="action" />}
              action={
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Button 
                    size="small" 
                    variant={i18n.language === 'en' ? 'contained' : 'outlined'}
                    onClick={() => handleLanguageChange('en')}
                    sx={{ minWidth: 32, px: 1, py: 0.2, fontSize: '0.7rem' }}
                  >
                    EN
                  </Button>
                  <Button 
                    size="small" 
                    variant={i18n.language === 'el' ? 'contained' : 'outlined'}
                    onClick={() => handleLanguageChange('el')}
                    sx={{ minWidth: 32, px: 1, py: 0.2, fontSize: '0.7rem' }}
                  >
                    EL
                  </Button>
                </Box>
              }
            />
          </SettingSection>

          {/* Notifications */}
          <SettingSection title={t('settings.notifications')} icon={<NotificationsIcon />}>
            <SettingItem
              label={t('settings.pushNotifications')}
              action={
                <Switch 
                  checked={preferences.showNative} 
                  onChange={(e) => updatePreferences({ showNative: e.target.checked })}
                  size="small" 
                />
              }
            />
            <SettingItem
              label={t('settings.inAppNotifications')}
              action={
                <Switch 
                  checked={preferences.showInApp} 
                  onChange={(e) => updatePreferences({ showInApp: e.target.checked })}
                  size="small" 
                />
              }
            />
            <SettingItem
              label={t('settings.soundAlerts')}
              action={
                <Switch 
                  checked={preferences.soundEnabled} 
                  onChange={(e) => updatePreferences({ soundEnabled: e.target.checked })}
                  size="small" 
                />
              }
            />
            
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                {t('settings.minimumPriority')}
              </Typography>
              <Select
                fullWidth
                size="small"
                value={preferences.minPriority}
                onChange={(e) => updatePreferences({ minPriority: e.target.value as any })}
              >
                <MenuItem value="low">{t('settings.lowPriority')}</MenuItem>
                <MenuItem value="normal">{t('settings.normalPriority')}</MenuItem>
                <MenuItem value="high">{t('settings.highPriority')}</MenuItem>
              </Select>
            </Box>

            <Typography variant="subtitle2" color="text.primary" sx={{ mb: 1, mt: 2, px: 2 }}>
              {t('settings.notificationTypes')}
            </Typography>
            <SettingItem
              label={t('settings.alarmNotifications')}
              description={t('settings.alarmNotificationsDesc')}
              action={
                <Switch 
                  checked={preferences.enabledTypes.includes('alarm')} 
                  onChange={(e) => {
                    const types = e.target.checked 
                      ? [...preferences.enabledTypes, 'alarm']
                      : preferences.enabledTypes.filter(t => t !== 'alarm');
                    updatePreferences({ enabledTypes: types });
                  }}
                  size="small" 
                />
              }
            />
            <SettingItem
              label={t('settings.commandNotifications')}
              description={t('settings.commandNotificationsDesc')}
              action={
                <Switch 
                  checked={preferences.enabledTypes.includes('command')} 
                  onChange={(e) => {
                    const types = e.target.checked 
                      ? [...preferences.enabledTypes, 'command']
                      : preferences.enabledTypes.filter(t => t !== 'command');
                    updatePreferences({ enabledTypes: types });
                  }}
                  size="small" 
                />
              }
            />
            <SettingItem
              label={t('settings.outputChangeNotifications')}
              description={t('settings.outputChangeNotificationsDesc')}
              action={
                <Switch 
                  checked={preferences.enabledTypes.includes('output_change')} 
                  onChange={(e) => {
                    const types = e.target.checked 
                      ? [...preferences.enabledTypes, 'output_change']
                      : preferences.enabledTypes.filter(t => t !== 'output_change');
                    updatePreferences({ enabledTypes: types });
                  }}
                  size="small" 
                />
              }
            />
            <SettingItem
              label={t('settings.inputChangeNotifications')}
              description={t('settings.inputChangeNotificationsDesc')}
              action={
                <Switch 
                  checked={preferences.enabledTypes.includes('input_change')} 
                  onChange={(e) => {
                    const types = e.target.checked 
                      ? [...preferences.enabledTypes, 'input_change']
                      : preferences.enabledTypes.filter(t => t !== 'input_change');
                    updatePreferences({ enabledTypes: types });
                  }}
                  size="small" 
                />
              }
            />
            <SettingItem
              label={t('settings.schedulerNotifications')}
              description={t('settings.schedulerNotificationsDesc')}
              action={
                <Switch 
                  checked={preferences.enabledTypes.includes('scheduler_trigger')} 
                  onChange={(e) => {
                    const types = e.target.checked 
                      ? [...preferences.enabledTypes, 'scheduler_trigger']
                      : preferences.enabledTypes.filter(t => t !== 'scheduler_trigger');
                    updatePreferences({ enabledTypes: types });
                  }}
                  size="small" 
                />
              }
            />
            <SettingItem
              label={t('settings.subscriptionNotifications')}
              description={t('settings.subscriptionNotificationsDesc')}
              action={
                <Switch 
                  checked={preferences.enabledTypes.includes('subscription_trigger')} 
                  onChange={(e) => {
                    const types = e.target.checked 
                      ? [...preferences.enabledTypes, 'subscription_trigger']
                      : preferences.enabledTypes.filter(t => t !== 'subscription_trigger');
                    updatePreferences({ enabledTypes: types });
                  }}
                  size="small" 
                />
              }
            />
          </SettingSection>

          {/* Data & Performance */}
          <SettingSection title={t('settings.dataPerformance')} icon={<SpeedIcon />}>
            <Box sx={{ mb: 2, px: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                {t('settings.defaultTimeRange')}
              </Typography>
              <Select size="small" fullWidth value={defaultTimeRange} onChange={handleDefaultTimeRange}>
                {['live','15m','1h','2h','4h','8h','16h','24h','3d','7d','30d'].map(v => (
                  <MenuItem key={v} value={v}>
                    {v === 'live' ? t('dashboard.live') : 
                     v === '15m' ? t('dashboard.last15m') :
                     v === '1h' ? t('dashboard.last1h') :
                     v === '2h' ? t('dashboard.last2h') :
                     v === '4h' ? t('dashboard.last4h') :
                     v === '8h' ? t('dashboard.last8h') :
                     v === '16h' ? t('dashboard.last16h') :
                     v === '24h' ? t('dashboard.last24h') :
                     v === '3d' ? t('dashboard.last3d') :
                     v === '7d' ? t('dashboard.last7d') :
                     v === '30d' ? t('dashboard.last30d') : v.toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </Box>
            <Box sx={{ px: 2 }}>
              <TextField 
                label={t('settings.refreshInterval')} 
                type="number" 
                value={refreshInterval} 
                onChange={handleRefreshIntervalChange}
                fullWidth 
                size="small"
                helperText={t('settings.refreshIntervalDesc')}
                InputProps={{ inputProps: { min: 10, max: 600 } }}
                sx={{ mb: 2 }}
              />
            </Box>
          </SettingSection>

          {/* Display Options */}
          <SettingSection title={t('settings.displayOptions')} icon={<MonitorIcon />}>
            <SettingItem
              label={t('settings.showBatterySignal')}
              description={t('settings.showBatterySignalDesc')}
              icon={<BatteryStdIcon fontSize="small" color="action" />}
              action={<Switch checked={showBatterySignal} onChange={(e) => setShowBatterySignal(e.target.checked)} size="small" />}
            />
            <SettingItem
              label={t('settings.showClientId')}
              description={t('settings.showClientIdDesc')}
              icon={<FingerprintIcon fontSize="small" color="action" />}
              action={<Switch checked={showClientId} onChange={(e) => setShowClientId(e.target.checked)} size="small" />}
            />
            <SettingItem
              label={t('settings.reduceMotion')}
              description={t('settings.reduceMotionDesc')}
              icon={<AnimationIcon fontSize="small" color="action" />}
              action={<Switch checked={reduceMotion} onChange={(e) => setReduceMotion(e.target.checked)} size="small" />}
            />
            <SettingItem
              label={t('settings.compactUI')}
              description={t('settings.compactUIDesc')}
              icon={<ViewCompactIcon fontSize="small" color="action" />}
              action={<Switch checked={compactUI} onChange={(e) => setCompactUI(e.target.checked)} size="small" />}
            />
            <Divider sx={{ my: 1 }} />
            <Typography variant="caption" color="primary" sx={{ px: 2, display: 'block', mt: 1, mb: 1, fontWeight: 600 }}>
              {t('settings.charts')}
            </Typography>
            <SettingItem
              label={t('settings.showDataPoints')}
              description={t('settings.showDataPointsDesc')}
              icon={<TimelineIcon fontSize="small" color="action" />}
              action={<Switch checked={showDataPoints} onChange={(e) => setShowDataPoints(e.target.checked)} size="small" />}
            />
            <SettingItem
              label={t('settings.showGrid')}
              description={t('settings.showGridDesc')}
              icon={<GridOnIcon fontSize="small" color="action" />}
              action={<Switch checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} size="small" />}
            />
          </SettingSection>

          {/* Thresholds */}
          <SettingSection title={t('settings.alertThresholds')} icon={<WarningIcon />}>
            <Box sx={{ px: 2, pb: 2 }}>
              <Typography gutterBottom variant="body2">{t('settings.batteryMin')}</Typography>
              <Slider
                value={batteryAlertThreshold}
                onChange={(_, val) => setBatteryAlertThreshold(val as number)}
                valueLabelDisplay="auto"
                step={5}
                marks
                min={0}
                max={50}
              />
              <Typography variant="caption" color="text.secondary">{t('settings.alertWhenBelow')} {batteryAlertThreshold}%</Typography>
            </Box>
            <Box sx={{ px: 2 }}>
              <Typography gutterBottom variant="body2">{t('settings.signalMin')}</Typography>
              <Slider
                value={signalAlertThreshold}
                onChange={(_, val) => setSignalAlertThreshold(val as number)}
                valueLabelDisplay="auto"
                step={5}
                marks
                min={0}
                max={50}
              />
              <Typography variant="caption" color="text.secondary">{t('settings.alertWhenBelow')} {signalAlertThreshold}%</Typography>
            </Box>
          </SettingSection>

          {/* Data Management */}
          <SettingSection title={t('settings.dataManagement')} icon={<StorageIcon />}>
            <ListItem button onClick={handleExportSettings}>
              <ListItemIcon><DownloadIcon /></ListItemIcon>
              <ListItemText primary={t('settings.exportSettings')} />
            </ListItem>
            <ListItem button onClick={handleImportSettings}>
              <ListItemIcon><UploadIcon /></ListItemIcon>
              <ListItemText primary={t('settings.importSettings')} />
            </ListItem>
          </SettingSection>

          {/* About */}
          <SettingSection title={t('settings.about')} icon={<InfoIcon />}>
             <ListItem>
               <ListItemText 
                 primary="NBtech Dashboard" 
                 secondary={`${t('settings.version')} 1.0.0 • ${t('settings.buildDate')} 2025-11-25`} 
               />
             </ListItem>
          </SettingSection>

        </Box>
      </Box>
    </Drawer>
  );
};

export default SettingsDrawer;
