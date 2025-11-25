import React, { useContext, useState } from "react";
import { 
  Drawer, 
  Box, 
  Typography, 
  IconButton, 
  List, 
  ListItem, 
  ListItemText, 
  Divider, 
  Switch, 
  FormControlLabel,
  Checkbox,
  TextField,
  FormGroup,
  Button,
  Select,
  MenuItem
} from "@mui/material";
import { SelectChangeEvent } from "@mui/material";
import { CustomThemeContext } from "../../../context/ThemeContext";
import { useTheme } from "@mui/material/styles";
import { Brightness7, Brightness4, Close } from "@mui/icons-material";

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
  const { currentTheme, setTheme } = useContext(CustomThemeContext);
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

  const toggleTheme = () => {
    setTheme(currentTheme === "dark" ? "light" : "dark");
  };

  const handlePushToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPushEnabled(event.target.checked);
    localStorage.setItem('pushEnabled', String(event.target.checked));
    // TODO: Wire this into NotificationService to respect the setting globally
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

  return (
    <Drawer 
      anchor="left" 
      open={open} 
      onClose={onClose}
      SlideProps={{ direction: 'right' }}
      PaperProps={{
        sx: {
          width: 360,
          left: 0,
          right: 'auto',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          background: 'linear-gradient(135deg, rgba(26, 31, 60, 0.95) 0%, rgba(31, 37, 71, 0.98) 50%, rgba(26, 31, 60, 0.95) 100%)',
          color: '#E0E0E0',
          backdropFilter: 'blur(10px)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #4caf50, #2196f3)'
          }
        }
      }}
    >
      <Box sx={{ p: 2, height: "100%" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, background: 'linear-gradient(45deg, #4caf50, #2196f3)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Settings
          </Typography>
          <Box sx={{ ml: 'auto' }}>
            <Button variant="outlined" size="small" onClick={onClose} sx={{ textTransform: 'none', borderColor: 'text.secondary', color: 'text.primary', '&:hover': { borderColor: 'text.primary', backgroundColor: 'rgba(0,0,0,0.04)' } }}>
              Close
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 2, opacity: 0.2 }} />

        {/* Theme */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'rgba(224,224,224,0.8)' }}>Appearance</Typography>
          <List sx={{ p: 0 }}>
            <ListItem button onClick={toggleTheme} sx={{ px: 0 }}>
              <ListItemText primary="Toggle Theme" secondary={currentTheme === 'dark' ? 'Dark' : 'Light'} />
              <IconButton size="small" sx={{ color: 'inherit' }}>
                {currentTheme === "dark" ? <Brightness7 /> : <Brightness4 />}
              </IconButton>
            </ListItem>
          </List>
        </Box>

        {/* Notifications */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'rgba(224,224,224,0.8)' }}>Notifications</Typography>
          <FormControlLabel
            control={<Switch checked={pushEnabled} onChange={handlePushToggle} color="primary" />}
            label="Enable Push Notifications"
          />
        </Box>

        {/* Display Options */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'rgba(224,224,224,0.8)' }}>Display Options</Typography>
          <FormGroup>
            {typeof showBatterySignal !== 'undefined' && onShowBatterySignalChange && (
              <FormControlLabel control={<Switch checked={!!showBatterySignal} onChange={onShowBatterySignalChange} />} label="Show Battery & Signal" />
            )}
            {typeof showClientId !== 'undefined' && onShowClientIdChange && (
              <FormControlLabel control={<Switch checked={!!showClientId} onChange={onShowClientIdChange} />} label="Show Client ID" />
            )}
            <FormControlLabel control={<Switch checked={reduceMotion} onChange={handleReduceMotion} />} label="Reduce Motion (fewer animations)" />
            <FormControlLabel control={<Switch checked={compactUI} onChange={handleCompactUI} />} label="Compact UI density" />
          </FormGroup>
        </Box>

        {/* Data & Refresh */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'rgba(224,224,224,0.8)' }}>Data & Refresh</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'rgba(224,224,224,0.7)' }}>Default Time Range</Typography>
              <Select size="small" fullWidth value={defaultTimeRange} onChange={handleDefaultTimeRange}>
                {['live','15m','1h','2h','4h','8h','16h','24h','3d','7d','30d'].map(v => (
                  <MenuItem key={v} value={v}>{v}</MenuItem>
                ))}
              </Select>
            </Box>
            <TextField 
              label="Refresh latest (sec)" 
              type="number" 
              size="small" 
              value={refreshLatestSecs}
              onChange={handleRefreshLatestSecs}
              inputProps={{ min: 10, max: 600 }}
            />
          </Box>
        </Box>

        {/* Chart Options */}
        {chartConfig && onChartConfigChange && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'rgba(224,224,224,0.8)' }}>Chart Options</Typography>
            <FormGroup>
              <FormControlLabel control={<Checkbox checked={!!chartConfig.showPoints} onChange={onChartConfigChange('showPoints')} />} label="Show Points" />
              <FormControlLabel control={<Checkbox checked={!!chartConfig.showGrid} onChange={onChartConfigChange('showGrid')} />} label="Show Grid" />
            </FormGroup>
          </Box>
        )}

        {/* Alerts */}
        {alertThresholds && onAlertThresholdChange && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'rgba(224,224,224,0.8)' }}>Alert Thresholds</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <TextField 
                label="Battery min %" 
                type="number" 
                size="small" 
                value={alertThresholds?.battery?.min ?? ''}
                onChange={onAlertThresholdChange('battery','min')}
              />
              <TextField 
                label="Signal min %" 
                type="number" 
                size="small" 
                value={alertThresholds?.signal?.min ?? alertThresholds?.signal_quality?.min ?? ''}
                onChange={onAlertThresholdChange('signal','min')}
              />
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 2, opacity: 0.2 }} />

        <List sx={{ p: 0 }}>
          <ListItem sx={{ px: 0 }}>
            <ListItemText primary="Contact" secondary="support@example.com" />
          </ListItem>
          <Divider sx={{ opacity: 0.1 }} />
          <ListItem sx={{ px: 0 }}>
            <ListItemText primary="About" secondary="IoT Dashboard v1.0" />
          </ListItem>
          <Divider sx={{ opacity: 0.1 }} />
          <ListItem sx={{ px: 0 }}>
            <ListItemText primary="Build" secondary={new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })} />
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
}

