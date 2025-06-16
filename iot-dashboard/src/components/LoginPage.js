import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { Box, Button, TextField, Typography, Paper, Checkbox, FormControlLabel, CircularProgress, InputAdornment, IconButton } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { Visibility, VisibilityOff } from '@mui/icons-material';

// Update the API URL to include /auth
const API_URL = "https://dv7723iff5.execute-api.eu-central-1.amazonaws.com/default/auth/login";

// Add console logging for debugging
console.log('API URL:', API_URL); // Debug log

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

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

  const handleSubmit = async (e) => {
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
      });
      
      // Save credentials if "Remember Me" is checked
      if (rememberMe) {
        localStorage.setItem('savedUser', JSON.stringify({ email: username, password: password }));
      } else {
        // Clear saved credentials if "Remember Me" is unchecked
        localStorage.removeItem('savedUser');
      }

      navigate('/devices');
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={(theme) => ({
        backgroundColor: theme.palette.background.default,
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        p: 2,
        color: theme.palette.text.primary,
      })}
    >
      <Helmet>
        <title>Login | IoT Dashboard</title>
        <meta name="description" content="Login to your IoT Dashboard" />
      </Helmet>
      <Paper sx={(theme) => ({ p: 3, width: 300, bgcolor: theme.palette.background.paper })}>
        <Typography variant="h4" align="center" sx={{ mb: 2 }}>
          IoT Dashboard Login
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Email"
            type="email"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
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
                onChange={(e) => setRememberMe(e.target.checked)}
                color="primary"
              />
            }
            label="Remember me"
            sx={{ mt: 1, mb: 2 }}
          />
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
          </Button>
        </Box>
        {error && (
          <Typography variant="body2" color="error" sx={{ mt: 2, textAlign: "center" }}>
            {error}
          </Typography>
        )}
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Typography variant="body2">
            Don't have an account?{" "}
            <Link to="/register" style={{ textDecoration: "none", fontWeight: "bold" }}>
              Register
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default LoginPage;
