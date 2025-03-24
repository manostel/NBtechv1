import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Box, Button, TextField, Typography, Paper } from "@mui/material";
import { Link } from "react-router-dom";

// Lambda API base endpoint
const API_URL = "https://5t48jkao80.execute-api.eu-central-1.amazonaws.com/default";

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Email/Password Login Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          email,
          password,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        onLogin({ email: result.email, clientID: result.client_id });
      } else {
        console.error("Login failed:", result.error || result.message);
        alert("Login failed. Please check your credentials.");
      }
    } catch (error) {
      console.error("Login error:", error);
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
          <Button type="submit" variant="contained">
            Log In
          </Button>
        </Box>
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
}
