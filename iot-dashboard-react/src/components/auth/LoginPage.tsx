import React, { useState, useEffect, FormEvent, ChangeEvent } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Box, Button, TextField, Typography, Paper, Checkbox, FormControlLabel, CircularProgress, InputAdornment, IconButton, useTheme } from "@mui/material";
import { Visibility, VisibilityOff, Login as LoginIcon } from '@mui/icons-material';
import { User } from '../../types';

// Update the API URL to include /auth
const API_URL = "https://dv7723iff5.execute-api.eu-central-1.amazonaws.com/default/auth/login";

// Add console logging for debugging
console.log('API URL:', API_URL); // Debug log

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const router = useRouter();
  const theme = useTheme();

  // Check for saved credentials on page load
  useEffect(() => {
    const savedUser = localStorage.getItem('savedUser');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUsername(userData.email || '');
      setPassword(userData.password || '');
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: username,
          password: password,
          action: 'login'
        }),
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store the user data including client_id
      onLogin({
        email: data.email,
        clientId: data.client_id || null,  // Handle case where client_id is not present
        authType: data.auth_type
      } as User);
      
      // Save credentials if "Remember Me" is checked
      if (rememberMe) {
        localStorage.setItem('savedUser', JSON.stringify({ email: username, password: password }));
      } else {
        // Clear saved credentials if "Remember Me" is unchecked
        localStorage.removeItem('savedUser');
      }

      router.push('/devices');
    } catch (error) {
      console.error('Login error:', error);
      setError((error as Error).message || 'Login failed. Please check your credentials and try again.');
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
      <Head>
        <title>Login | IoT Dashboard</title>
        <meta name="description" content="Login to your IoT Dashboard" />
        <style>{`
          @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.05); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </Head>
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
        <Box sx={{ textAlign: 'center', mb: 3 }}>
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
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
              mb: 1
            }}
          >
            NB-Tech v1
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: theme.palette.text.secondary,
              fontWeight: 500,
              letterSpacing: '0.3px'
            }}
          >
            IoT Dashboard
          </Typography>
        </Box>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <TextField
            label="Email"
            type="email"
            required
            value={username}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
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
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
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
          <FormControlLabel
            control={
              <Checkbox
                checked={rememberMe}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setRememberMe(e.target.checked)}
                color="primary"
                sx={{
                  '&.Mui-checked': {
                    color: theme.palette.mode === 'dark' ? '#4caf50' : '#1976d2'
                  }
                }}
              />
            }
            label="Remember me"
            sx={{ 
              mt: 1, 
              mb: 1,
              '& .MuiFormControlLabel-label': {
                fontSize: '0.9rem',
                fontWeight: 500
              }
            }}
          />
          <Button 
            type="submit" 
            variant="contained" 
            disabled={isLoading}
            startIcon={!isLoading ? <LoginIcon /> : undefined}
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
                <span>Signing in...</span>
              </Box>
            ) : (
              'Sign In'
            )}
          </Button>
        </Box>
        {error && (
          <Box 
            sx={{ 
              mt: 3, 
              p: 2, 
              borderRadius: 2,
              background: theme.palette.mode === 'dark' 
                ? 'rgba(244, 67, 54, 0.1)' 
                : 'rgba(244, 67, 54, 0.05)',
              border: theme.palette.mode === 'dark' 
                ? '1px solid rgba(244, 67, 54, 0.3)' 
                : '1px solid rgba(244, 67, 54, 0.2)',
              textAlign: "center"
            }}
          >
            <Typography 
              variant="body2" 
              sx={{ 
                color: theme.palette.mode === 'dark' ? '#f44336' : '#d32f2f',
                fontWeight: 500
              }}
            >
              {error}
            </Typography>
          </Box>
        )}
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Typography 
            variant="body2" 
            sx={{ 
              color: theme.palette.text.secondary,
              fontSize: '0.9rem'
            }}
          >
            Don't have an account?{" "}
            <Link 
              href="/register"
              style={{ 
                textDecoration: "none", 
                fontWeight: "600",
                color: theme.palette.mode === 'dark' ? '#4caf50' : '#1976d2',
                transition: 'all 0.2s ease'
              }}
            >
              Create Account
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default LoginPage;

