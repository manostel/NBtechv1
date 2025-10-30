import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Box, Button, TextField, Typography, Paper, InputAdornment, IconButton } from "@mui/material";
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
      navigate("/devices");
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
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        p: 2,
        color: 'inherit',
        background: 'linear-gradient(135deg, rgba(26, 31, 60, 0.95) 0%, rgba(31, 37, 71, 0.98) 50%, rgba(26, 31, 60, 0.95) 100%)'
      }}
    >
      <Helmet>
        <title>Register | IoT Dashboard</title>
        <meta name="description" content="Register for your IoT Dashboard" />
      </Helmet>
      <Paper sx={{
        p: 4,
        width: { xs: '100%', sm: 400 },
        maxWidth: 400,
        borderRadius: 4,
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(26, 31, 60, 0.92) 0%, rgba(31, 37, 71, 0.96) 50%, rgba(26, 31, 60, 0.92) 100%)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #4caf50, #2196f3)'
        }
      }}>
        <Box sx={{ mb: 1, display: 'flex', justifyContent: 'flex-start' }}>
          <Button 
            size="small" 
            startIcon={<ArrowBack />} 
            onClick={() => navigate('/login')} 
            sx={{ textTransform: 'none', color: '#E0E0E0' }}
          >
            Back to Login
          </Button>
        </Box>
        <Typography variant="h4" align="center" sx={{ mb: 2, color: '#E0E0E0', fontWeight: 700, letterSpacing: '0.5px' }}>
          Register
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <TextField
            label="Confirm Password"
            type={showConfirmPassword ? "text" : "password"}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={Boolean(error) && error.includes('match')}
            helperText={Boolean(error) && error.includes('match') ? error : ''}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle confirm password visibility"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <Button type="submit" variant="contained" disabled={isLoading} sx={{ py: 1.5, borderRadius: 2, fontWeight: 600 }}>
            {isLoading ? 'Registering...' : 'Register'}
          </Button>
          {error && <Typography color="error">{error}</Typography>}
        </Box>
      </Paper>
    </Box>
  );
}
