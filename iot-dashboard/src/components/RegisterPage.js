import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Box, Button, TextField, Typography, Paper } from "@mui/material";

// Use the same API endpoint as your Lambda
const API_URL = "https://5t48jkao80.execute-api.eu-central-1.amazonaws.com/default";

export default function RegisterPage({ onRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clientID, setClientID] = useState(""); // Optional: you can auto-generate or let the user specify a device/client id

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          email,
          password,
          client_id: clientID, // you might generate this or ask the user to input it
          auth_type: "email"
        }),
      });
      const result = await response.json();
      if (response.ok) {
        alert("Registration successful");
        if (onRegister) {
          onRegister({ email, clientID });
        }
      } else {
        console.error("Registration failed:", result.error || result.message);
        alert("Registration failed. " + (result.error || result.message));
      }
    } catch (error) {
      console.error("Registration error:", error);
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
      <Paper sx={(theme) => ({ p: 3, width: 300, bgcolor: theme.palette.background.paper })}>
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
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <TextField
            label="Client ID"
            type="text"
            required
            value={clientID}
            onChange={(e) => setClientID(e.target.value)}
            helperText="Enter the device or client identifier"
          />
          <Button type="submit" variant="contained">
            Sign Up
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
