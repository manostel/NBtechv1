import React from "react";
import { AppBar, Toolbar, Typography, IconButton, Box } from "@mui/material";
import { ArrowBack as ArrowBackIcon, Logout as LogoutIcon } from '@mui/icons-material';
import { useTheme } from "@mui/material/styles";

export default function DashboardHeader({ device, onBack, onLogout, user }) {
  const theme = useTheme();

  return (
    <AppBar 
      position="static" 
      color="primary" 
      elevation={0}
      sx={{
        borderBottom: `1px solid ${theme.palette.divider}`,
        width: '100%',
      }}
    >
      <Toolbar 
        sx={{ 
          px: { xs: 1.5, sm: 3 },
          py: { xs: 1, sm: 0.5 },
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
        }}
      > 
        <IconButton
          edge="start"
          color="inherit"
          aria-label="back to devices"
          onClick={onBack}
          sx={{ 
            mr: 2,
            display: 'flex',
            alignItems: 'center',
            mb: { xs: 1, sm: 0 }
          }}
        >
          <ArrowBackIcon />
          <Typography 
            variant="body2" 
            sx={{ 
              ml: 0.5, 
              display: { xs: 'none', sm: 'block' }
            }}
          >
            Devices
          </Typography>
        </IconButton>
        
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            flexGrow: 1,
            mb: { xs: 1, sm: 0 },
            fontSize: { xs: '1rem', sm: '1.25rem' },
            textAlign: { xs: 'left', sm: 'center' },
            fontWeight: 'medium'
          }}
        >
          Dashboard{device && ` - ${device.device_name}`}
        </Typography>

        <Box 
          sx={{ 
            display: "flex", 
            alignItems: "center", 
            gap: { xs: 0.5, sm: 1 },
            flexWrap: 'wrap',
            justifyContent: { xs: 'flex-start', sm: 'flex-end' },
            width: { xs: '100%', sm: 'auto' }
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              bgcolor: theme.palette.primary.main,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography variant="h6" sx={{ color: "#fff" }}>
              {user.email[0].toUpperCase()}
            </Typography>
          </Box>
          <Typography 
            variant="body2" 
            noWrap 
            sx={{ 
              maxWidth: { xs: '100px', sm: '150px', md: '300px' },
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {user.email}
          </Typography>
          <IconButton
            color="inherit"
            onClick={onLogout}
          >
            <LogoutIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
} 