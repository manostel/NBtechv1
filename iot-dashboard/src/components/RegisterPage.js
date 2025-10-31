import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Box, Button, TextField, Typography, Paper, InputAdornment, IconButton, CircularProgress, useTheme } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Visibility, VisibilityOff, ArrowBack } from '@mui/icons-material';

// Use the same API endpoint as your Lambda
const API_URL = "https://dv7723iff5.execute-api.eu-central-1.amazonaws.com/default/auth/register";

export default function RegisterPage({ onRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      const payload = {
        email,
        password,
        action: 'register',
        auth_type: 'email',
        client_id: email  // Using email as client_id for now
      };

      console.log('Sending registration request with payload:', payload);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('Registration response:', data);

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Store the user data including client_id
      onRegister({ 
        email: data.email,
        clientId: data.client_id,
        authType: data.auth_type
      });
      // Return to starting page after successful registration without full reload
      navigate('/');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, #141829 0%, #1a1f3c 50%, #141829 100%)'
          : 'linear-gradient(135deg, #f5f5f5 0%, #e8f4fd 50%, #f5f5f5 100%)',
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        p: 2,
        color: theme.palette.text.primary,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: theme.palette.mode === 'dark'
            ? 'radial-gradient(circle at 20% 50%, rgba(76, 175, 80, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(33, 150, 243, 0.1) 0%, transparent 50%)'
            : 'radial-gradient(circle at 20% 50%, rgba(76, 175, 80, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(33, 150, 243, 0.05) 0%, transparent 50%)',
          pointerEvents: 'none'
        }
      }}
    >
      <Helmet>
        <title>Register | IoT Dashboard</title>
        <meta name="description" content="Register for your IoT Dashboard" />
      </Helmet>
      <Paper 
        sx={{ 
          p: 4, 
          width: { xs: '100%', sm: 400 }, 
          maxWidth: 400,
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.95) 0%, rgba(31, 37, 71, 0.98) 50%, rgba(26, 31, 60, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.98) 50%, rgba(255, 255, 255, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: 4,
          boxShadow: theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
            : '0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          border: theme.palette.mode === 'dark' 
            ? '1px solid rgba(255, 255, 255, 0.1)' 
            : '1px solid rgba(0, 0, 0, 0.1)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(90deg, #4caf50, #2196f3)'
              : 'linear-gradient(90deg, #1976d2, #388e3c)',
            borderRadius: '4px 4px 0 0'
          }
        }}
      >
        <Box sx={{ mb: 1, display: 'flex', justifyContent: 'flex-start' }}>
          <Button 
            size="small" 
            startIcon={<ArrowBack />} 
            onClick={() => {
              // Ensure any existing session is cleared so route '/' shows Login
              localStorage.removeItem('user');
              localStorage.removeItem('loginTimestamp');
              localStorage.removeItem('selectedDevice');
              navigate('/');
            }} 
            sx={{ 
              textTransform: 'none', 
              color: theme.palette.text.secondary,
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
          >
            Back to Login
          </Button>
        </Box>
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700,
              fontStyle: 'italic',
              letterSpacing: '0.5px',
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(45deg, #4caf50, #2196f3)'
                : 'linear-gradient(45deg, #1976d2, #388e3c)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            Create Account
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: theme.palette.text.secondary,
              fontWeight: 500,
              letterSpacing: '0.3px'
            }}
          >
            Join NB-Tech v1
          </Typography>
        </Box>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <TextField
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: theme.palette.mode === 'dark' 
                    ? '0 4px 12px rgba(0, 0, 0, 0.3)' 
                    : '0 4px 12px rgba(0, 0, 0, 0.1)'
                },
                '&.Mui-focused': {
                  transform: 'translateY(-1px)',
                  boxShadow: theme.palette.mode === 'dark' 
                    ? '0 4px 12px rgba(76, 175, 80, 0.3)' 
                    : '0 4px 12px rgba(25, 118, 210, 0.3)'
                }
              }
            }}
          />
          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: theme.palette.mode === 'dark' 
                    ? '0 4px 12px rgba(0, 0, 0, 0.3)' 
                    : '0 4px 12px rgba(0, 0, 0, 0.1)'
                },
                '&.Mui-focused': {
                  transform: 'translateY(-1px)',
                  boxShadow: theme.palette.mode === 'dark' 
                    ? '0 4px 12px rgba(76, 175, 80, 0.3)' 
                    : '0 4px 12px rgba(25, 118, 210, 0.3)'
                }
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    sx={{
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.1)' 
                          : 'rgba(0, 0, 0, 0.04)',
                        transform: 'scale(1.1)'
                      }
                    }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Confirm Password"
            type={showConfirmPassword ? "text" : "password"}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={Boolean(error) && error.includes('match')}
            helperText={Boolean(error) && error.includes('match') ? error : ''}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: theme.palette.mode === 'dark' 
                    ? '0 4px 12px rgba(0, 0, 0, 0.3)' 
                    : '0 4px 12px rgba(0, 0, 0, 0.1)'
                },
                '&.Mui-focused': {
                  transform: 'translateY(-1px)',
                  boxShadow: theme.palette.mode === 'dark' 
                    ? '0 4px 12px rgba(76, 175, 80, 0.3)' 
                    : '0 4px 12px rgba(25, 118, 210, 0.3)'
                }
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle confirm password visibility"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                    sx={{
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.1)' 
                          : 'rgba(0, 0, 0, 0.04)',
                        transform: 'scale(1.1)'
                      }
                    }}
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button 
            type="submit" 
            variant="contained" 
            disabled={isLoading}
            sx={{
              py: 1.5,
              borderRadius: 2,
              fontSize: '1rem',
              fontWeight: 600,
              textTransform: 'none',
              letterSpacing: '0.5px',
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(45deg, #4caf50, #2196f3)'
                : 'linear-gradient(45deg, #1976d2, #388e3c)',
              boxShadow: theme.palette.mode === 'dark'
                ? '0 4px 15px rgba(76, 175, 80, 0.3)'
                : '0 4px 15px rgba(25, 118, 210, 0.3)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: theme.palette.mode === 'dark'
                  ? '0 6px 20px rgba(76, 175, 80, 0.4)'
                  : '0 6px 20px rgba(25, 118, 210, 0.4)',
                background: theme.palette.mode === 'dark'
                  ? 'linear-gradient(45deg, #5cbf60, #3399f3)'
                  : 'linear-gradient(45deg, #1e88e5, #43a047)'
              },
              '&:disabled': {
                background: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(0, 0, 0, 0.1)',
                color: theme.palette.text.disabled
              }
            }}
          >
            {isLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} color="inherit" />
                <span>Registering...</span>
              </Box>
            ) : (
              'Create Account'
            )}
          </Button>
          {error && <Typography color="error">{error}</Typography>}
        </Box>
      </Paper>
    </Box>
  );
}
