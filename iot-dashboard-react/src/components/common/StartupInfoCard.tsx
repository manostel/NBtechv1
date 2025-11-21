import React from 'react';
import { Paper, Typography, Box, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Build, Storage } from '@mui/icons-material';

interface StartupData {
  firmware_version?: string;
  boot_reason?: string;
}

interface StartupInfoCardProps {
  startupData: StartupData | null;
}

const StartupInfoCard: React.FC<StartupInfoCardProps> = ({ startupData }) => {
  const theme = useTheme();

  if (!startupData) {
    return null;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
        border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {/* Firmware Version - Most Prominent */}
        {startupData.firmware_version && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Build sx={{ fontSize: '1rem', color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
              Firmware:
            </Typography>
            <Chip
              label={startupData.firmware_version}
              size="small"
              sx={{
                height: '20px',
                fontSize: '0.75rem',
                fontWeight: 600,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.2)' : 'rgba(25, 118, 210, 0.1)',
                color: theme.palette.mode === 'dark' ? '#64b5f6' : '#1976d2',
                border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(100, 181, 246, 0.3)' : 'rgba(25, 118, 210, 0.3)'}`,
              }}
            />
          </Box>
        )}

        {/* Boot Reason */}
        {startupData.boot_reason && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Storage sx={{ fontSize: '1rem', color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
              Boot: {startupData.boot_reason}
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default StartupInfoCard;


