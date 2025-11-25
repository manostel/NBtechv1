import React, { useContext, useState } from "react";
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
  Divider, 
  Switch, 
  Checkbox,
  TextField,
  Button,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Stack,
} from "@mui/material";
import { SelectChangeEvent } from "@mui/material";
import { CustomThemeContext } from "../../../context/ThemeContext";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from 'react-i18next';
import {
  Brightness7, 
  Brightness4, 
  Close,
  ExpandMore,
  Notifications as NotificationsIcon,
  BarChart as BarChartIcon,
  Warning as WarningIcon,
  Palette as PaletteIcon,
  Speed as SpeedIcon,
  Info as InfoIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Language as LanguageIcon,
  Storage as StorageIcon,
  HelpOutline as HelpOutlineIcon,
} from "@mui/icons-material";
import useNotificationStore from '../../../stores/notificationStore';

interface ChartConfig {
  showPoints?: boolean;
  showGrid?: boolean;
  [key: string]: any;
}

interface AlertThresholds {
  battery?: { min?: number };
  signal?: { min?: number };
  signal_quality?: { min?: number };
  [key: string]: any;
}

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  chartConfig?: ChartConfig;
  onChartConfigChange?: (key: string) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  alertThresholds?: AlertThresholds;
  onAlertThresholdChange?: (category: string, type: string) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  showBatterySignal?: boolean;
  onShowBatterySignalChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  showClientId?: boolean;
  onShowClientIdChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function SettingsDrawer({ 
  open, 
  onClose,
  chartConfig,
  onChartConfigChange,
  alertThresholds,
  onAlertThresholdChange,
  showBatterySignal,
  onShowBatterySignalChange,
  showClientId,
  onShowClientIdChange
}: SettingsDrawerProps) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { currentTheme, setTheme } = useContext(CustomThemeContext);
  const { preferences, updatePreferences } = useNotificationStore();
  
  // Persist pushEnabled in localStorage
  const [pushEnabled, setPushEnabled] = useState(() => {
    const stored = localStorage.getItem('pushEnabled');
    return stored === null ? true : stored === 'true';
  });
  const [defaultTimeRange, setDefaultTimeRange] = useState(() => localStorage.getItem('defaultTimeRange') || '1h');
  const [refreshLatestSecs, setRefreshLatestSecs] = useState(() => {
    const v = parseInt(localStorage.getItem('refreshLatestSecs') || '60', 10);
    return Number.isFinite(v) ? v : 60;
  });
  const [reduceMotion, setReduceMotion] = useState(() => localStorage.getItem('reduceMotion') === 'true');
  const [compactUI, setCompactUI] = useState(() => localStorage.getItem('compactUI') === 'true');
  const [language, setLanguage] = useState(() => i18n.language || 'en');
  const [dataRetention, setDataRetention] = useState(() => localStorage.getItem('dataRetention') || '30');

  const toggleTheme = () => {
    setTheme(currentTheme === "dark" ? "light" : "dark");
  };

  const handlePushToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPushEnabled(event.target.checked);
    localStorage.setItem('pushEnabled', String(event.target.checked));
  };

  const handleDefaultTimeRange = (e: SelectChangeEvent<string>) => {
    setDefaultTimeRange(e.target.value);
    localStorage.setItem('defaultTimeRange', e.target.value);
  };

  const handleRefreshLatestSecs = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(10, Math.min(600, parseInt(e.target.value || '60', 10)));
    setRefreshLatestSecs(val);
    localStorage.setItem('refreshLatestSecs', String(val));
  };

  const handleReduceMotion = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReduceMotion(e.target.checked);
    localStorage.setItem('reduceMotion', String(e.target.checked));
    document.documentElement.style.setProperty('--animations-enabled', e.target.checked ? '0' : '1');
  };

  const handleCompactUI = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCompactUI(e.target.checked);
    localStorage.setItem('compactUI', String(e.target.checked));
    document.documentElement.style.setProperty('--density', e.target.checked ? 'compact' : 'comfortable');
  };

  const handleLanguageChange = (e: SelectChangeEvent<string>) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    i18n.changeLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  const handleDataRetentionChange = (e: SelectChangeEvent<string>) => {
    setDataRetention(e.target.value);
    localStorage.setItem('dataRetention', e.target.value);
  };

  const handleExportData = () => {
    const settings = {
      theme: currentTheme,
      pushEnabled,
      defaultTimeRange,
      refreshLatestSecs,
      reduceMotion,
      compactUI,
      language,
      dataRetention,
      notificationPreferences: preferences,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iot-dashboard-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event: any) => {
          try {
            const settings = JSON.parse(event.target.result);
            if (settings.theme) setTheme(settings.theme);
            if (settings.pushEnabled !== undefined) {
              setPushEnabled(settings.pushEnabled);
              localStorage.setItem('pushEnabled', String(settings.pushEnabled));
            }
            if (settings.defaultTimeRange) {
              setDefaultTimeRange(settings.defaultTimeRange);
              localStorage.setItem('defaultTimeRange', settings.defaultTimeRange);
            }
            if (settings.refreshLatestSecs) {
              setRefreshLatestSecs(settings.refreshLatestSecs);
              localStorage.setItem('refreshLatestSecs', String(settings.refreshLatestSecs));
            }
            if (settings.notificationPreferences) {
              updatePreferences(settings.notificationPreferences);
            }
            alert('Settings imported successfully!');
          } catch (error) {
            alert('Failed to import settings. Invalid file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const SettingSection: React.FC<{ 
    title: string; 
    icon: React.ReactNode; 
    children: React.ReactNode;
    defaultExpanded?: boolean;
  }> = ({ title, icon, children, defaultExpanded = false }) => (
    <Accordion 
      defaultExpanded={defaultExpanded}
      sx={{ 
        mb: 1,
        '&:before': { display: 'none' },
        bgcolor: 'transparent',
        boxShadow: 'none',
        border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        borderRadius: 2,
        '&.Mui-expanded': {
          margin: '0 0 8px 0',
        },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMore sx={{ color: 'text.secondary' }} />}
        sx={{
          px: 2,
          py: 1,
          minHeight: 48,
          '&.Mui-expanded': {
            minHeight: 48,
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
          <Box sx={{ color: 'primary.main' }}>{icon}</Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2, pb: 2 }}>
        {children}
      </AccordionDetails>
    </Accordion>
  );

  const SettingItem: React.FC<{
    label: string;
    description?: string;
    icon?: React.ReactNode;
    action: React.ReactNode;
  }> = ({ label, description, icon, action }) => (
    <ListItem sx={{ px: 0, py: 1.5 }}>
      {icon && <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>{icon}</ListItemIcon>}
      <ListItemText
        primary={label}
        secondary={description}
        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
        secondaryTypographyProps={{ variant: 'caption', sx: { mt: 0.5 } }}
      />
      <ListItemSecondaryAction>{action}</ListItemSecondaryAction>
    </ListItem>
  );

  return (
    <Drawer 
      anchor="left" 
      open={open} 
      onClose={onClose}
      SlideProps={{ direction: 'right' }}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 420 },
          left: 0,
          right: 'auto',
          borderRight: `1px solid ${theme.palette.divider}`,
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.98) 0%, rgba(31, 37, 71, 0.98) 50%, rgba(26, 31, 60, 0.98) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 50%, rgba(255, 255, 255, 0.98) 100%)',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #4caf50, #2196f3)',
          }
        }
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box sx={{ p: 3, pb: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PaletteIcon sx={{ color: 'primary.main' }} />
              {t('settings.title')}
            </Typography>
            <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
              <Close />
            </IconButton>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {t('settings.changesSaved')}
          </Typography>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {/* Appearance */}
          <SettingSection title={t('settings.appearance')} icon={<PaletteIcon />} defaultExpanded>
            <SettingItem
              label={t('settings.theme')}
              description={currentTheme === 'dark' ? t('settings.darkMode') : t('settings.lightMode')}
              icon={<Brightness4 />}
              action={
                <IconButton onClick={toggleTheme} size="small" sx={{ color: 'primary.main' }}>
                  {currentTheme === "dark" ? <Brightness7 /> : <Brightness4 />}
                </IconButton>
              }
            />
            <Divider sx={{ my: 1 }} />
            <SettingItem
              label={t('settings.compactUI')}
              description={t('settings.compactUIDesc')}
              action={
                <Switch checked={compactUI} onChange={handleCompactUI} size="small" />
              }
            />
            <SettingItem
              label={t('settings.reduceMotion')}
              description={t('settings.reduceMotionDesc')}
              action={
                <Switch checked={reduceMotion} onChange={handleReduceMotion} size="small" />
              }
            />
            {typeof showBatterySignal !== 'undefined' && onShowBatterySignalChange && (
              <>
                <Divider sx={{ my: 1 }} />
                <SettingItem
                  label={t('settings.showBatterySignal')}
                  description={t('settings.showBatterySignalDesc')}
                  action={
                    <Switch checked={!!showBatterySignal} onChange={onShowBatterySignalChange} size="small" />
                  }
                />
              </>
            )}
            {typeof showClientId !== 'undefined' && onShowClientIdChange && (
              <SettingItem
                label={t('settings.showClientId')}
                description={t('settings.showClientIdDesc')}
                action={
                  <Switch checked={!!showClientId} onChange={onShowClientIdChange} size="small" />
                }
              />
            )}
          </SettingSection>

          {/* Notifications */}
          <SettingSection title={t('settings.notifications')} icon={<NotificationsIcon />}>
            <SettingItem
              label={t('settings.pushNotifications')}
              description={t('settings.pushNotifications')}
              action={
                <Switch checked={pushEnabled} onChange={handlePushToggle} size="small" />
              }
            />
            <Divider sx={{ my: 1 }} />
            <SettingItem
              label={t('settings.inAppNotifications')}
              description={t('settings.inAppNotifications')}
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
              description={t('settings.soundAlerts')}
              action={
                <Switch 
                  checked={preferences.soundEnabled ?? false} 
                  onChange={(e) => updatePreferences({ soundEnabled: e.target.checked })}
                  size="small" 
                />
              }
            />
            <Divider sx={{ my: 1 }} />
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                {t('settings.minimumPriority')}
              </Typography>
              <Select
                size="small"
                fullWidth
                value={preferences.minPriority || 'normal'}
                onChange={(e) => updatePreferences({ minPriority: e.target.value as any })}
              >
                <MenuItem value="low">{t('settings.lowPriority')}</MenuItem>
                <MenuItem value="normal">{t('settings.normalPriority')}</MenuItem>
                <MenuItem value="high">{t('settings.highPriority')}</MenuItem>
              </Select>
            </Box>
          </SettingSection>

          {/* Data & Performance */}
          <SettingSection title={t('settings.dataPerformance')} icon={<SpeedIcon />}>
            <Box sx={{ mb: 2 }}>
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
            <TextField 
              label={t('settings.refreshInterval')} 
              type="number" 
              size="small" 
              fullWidth
              value={refreshLatestSecs}
              onChange={handleRefreshLatestSecs}
              inputProps={{ min: 10, max: 600 }}
              helperText={t('settings.refreshIntervalDesc')}
              sx={{ mb: 2 }}
            />
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                {t('settings.dataRetention')}
              </Typography>
              <Select size="small" fullWidth value={dataRetention} onChange={handleDataRetentionChange}>
                <MenuItem value="7">7 {t('settings.days')}</MenuItem>
                <MenuItem value="30">30 {t('settings.days')}</MenuItem>
                <MenuItem value="90">90 {t('settings.days')}</MenuItem>
                <MenuItem value="180">180 {t('settings.days')}</MenuItem>
                <MenuItem value="365">1 {t('settings.year')}</MenuItem>
              </Select>
            </Box>
          </SettingSection>

          {/* Charts */}
          {chartConfig && onChartConfigChange && (
            <SettingSection title={t('settings.charts')} icon={<BarChartIcon />}>
              <SettingItem
                label={t('settings.showDataPoints')}
                description={t('settings.showDataPointsDesc')}
                action={
                  <Checkbox checked={!!chartConfig.showPoints} onChange={onChartConfigChange('showPoints')} size="small" />
                }
              />
              <SettingItem
                label={t('settings.showGrid')}
                description={t('settings.showGridDesc')}
                action={
                  <Checkbox checked={!!chartConfig.showGrid} onChange={onChartConfigChange('showGrid')} size="small" />
                }
              />
            </SettingSection>
          )}

          {/* Alerts */}
          {alertThresholds && onAlertThresholdChange && (
            <SettingSection title={t('settings.alertThresholds')} icon={<WarningIcon />}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField 
                  label={t('settings.batteryMin')} 
                  type="number" 
                  size="small" 
                  value={alertThresholds?.battery?.min ?? ''}
                  onChange={onAlertThresholdChange('battery','min')}
                  helperText={t('settings.alertWhenBelow')}
                />
                <TextField 
                  label={t('settings.signalMin')} 
                  type="number" 
                  size="small" 
                  value={alertThresholds?.signal?.min ?? alertThresholds?.signal_quality?.min ?? ''}
                  onChange={onAlertThresholdChange('signal','min')}
                  helperText={t('settings.alertWhenBelow')}
                />
              </Box>
            </SettingSection>
          )}

          {/* Localization */}
          <SettingSection title={t('settings.localization')} icon={<LanguageIcon />}>
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                {t('settings.language')}
              </Typography>
              <Select size="small" fullWidth value={language} onChange={handleLanguageChange}>
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="el">Ελληνικά (Greek)</MenuItem>
              </Select>
            </Box>
          </SettingSection>

          {/* Data Management */}
          <SettingSection title={t('settings.dataManagement')} icon={<StorageIcon />}>
            <Stack spacing={1}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExportData}
                fullWidth
                size="small"
              >
                {t('settings.exportSettings')}
              </Button>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={handleImportData}
                fullWidth
                size="small"
              >
                {t('settings.importSettings')}
              </Button>
            </Stack>
          </SettingSection>

          {/* About */}
          <SettingSection title={t('settings.about')} icon={<InfoIcon />}>
            <List dense sx={{ p: 0 }}>
              <ListItem sx={{ px: 0, py: 0.5 }}>
                <ListItemText 
                  primary={t('settings.version')} 
                  secondary="1.0.0"
                  primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                  secondaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                />
              </ListItem>
              <ListItem sx={{ px: 0, py: 0.5 }}>
                <ListItemText 
                  primary={t('settings.buildDate')} 
                  secondary={new Date().toLocaleDateString(i18n.language === 'el' ? 'el-GR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                  secondaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                />
              </ListItem>
              <ListItem sx={{ px: 0, py: 0.5 }}>
                <ListItemText 
                  primary={t('settings.support')} 
                  secondary="support@iotdashboard.com"
                  primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                  secondaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                />
              </ListItem>
            </List>
          </SettingSection>
        </Box>

        {/* Footer */}
        <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
          <Alert severity="info" icon={<HelpOutlineIcon />} sx={{ mb: 1 }}>
            <Typography variant="caption">
              {t('settings.changesSaved')}
            </Typography>
          </Alert>
          <Button variant="contained" fullWidth onClick={onClose}>
            {t('common.done')}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}

