import React, { useContext, useState } from "react";
import { Drawer, Box, Typography, IconButton, List, ListItem, ListItemText, Divider, Switch, FormControlLabel } from "@mui/material";
import { CustomThemeContext } from "./ThemeContext";
import { Brightness7, Brightness4, Close } from "@mui/icons-material";

export default function SettingsDrawer({ open, onClose }) {
  const { currentTheme, setTheme } = useContext(CustomThemeContext);
  const [pushEnabled, setPushEnabled] = useState(false);

  const toggleTheme = () => {
    setTheme(currentTheme === "dark" ? "light" : "dark");
  };

  const handlePushToggle = (event) => {
    setPushEnabled(event.target.checked);
    // Here you would add logic to enable/disable push notifications
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 300, p: 2, height: "100%", bgcolor: "background.default", color: "text.primary" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6">Settings</Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
        <Divider sx={{ my: 1 }} />
        {/* Notification Settings Section */}
        <FormControlLabel
          control={<Switch checked={pushEnabled} onChange={handlePushToggle} color="primary" />}
          label="Enable Push Notifications"
          sx={{ mb: 2 }}
        />
        <List>
          <ListItem button onClick={toggleTheme}>
            <ListItemText primary="Toggle Theme" />
            <IconButton>
              {currentTheme === "dark" ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemText primary="Contact Info" secondary="support@example.com" />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemText primary="About" secondary="IoT Dashboard v1.0" />
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
}
