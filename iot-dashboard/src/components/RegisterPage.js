import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Box, Button, TextField, Typography, Paper, InputAdornment, IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Visibility, VisibilityOff } from '@mui/icons-material';

// Use the same API endpoint as your Lambda
const API_URL = "https://dv7723iff5.execute-api.eu-central-1.amazonaws.com/default/auth/register";

export default function RegisterPage({ onRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
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
        <title>Register | IoT Dashboard</title>
        <meta name="description" content="Register for your IoT Dashboard" />
      </Helmet>
      <Paper sx={(theme) => ({ p: 3, width: 400, bgcolor: theme.palette.background.paper })}>
        <Typography variant="h4" align="center" sx={{ mb: 2 }}>
          Register
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? 'Registering...' : 'Register'}
          </Button>
          {error && <Typography color="error">{error}</Typography>}
        </Box>
      </Paper>
    </Box>
  );
}
