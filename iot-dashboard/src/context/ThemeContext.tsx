import React, { createContext, useMemo, useState, useContext, useEffect, ReactNode } from "react";
import { createTheme, ThemeProvider, Theme } from "@mui/material/styles";
import { CssBaseline, Paper, Button, IconButton, Card, AppBar, Drawer, ListItem } from "@mui/material";

interface CustomThemeContextType {
  currentTheme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
}

export const CustomThemeContext = createContext<CustomThemeContextType | undefined>(undefined);

export const useCustomTheme = (): CustomThemeContextType => {
  const context = useContext(CustomThemeContext);
  if (!context) {
    throw new Error('useCustomTheme must be used within a CustomThemeProvider');
  }
  return context;
};

interface CustomThemeProviderProps {
  children: ReactNode;
}

export const CustomThemeProvider: React.FC<CustomThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<"light" | "dark">("dark");

  // Apply the theme to the HTML element to prevent flashes
  useEffect(() => {
    // Apply theme-specific attributes to document elements
    document.documentElement.setAttribute('data-theme', themeMode);
    document.body.style.backgroundColor = themeMode === "dark" ? "#141829" : "#f5f5f5";
    document.body.style.color = themeMode === "dark" ? "#E0E0E0" : "#333";
    
    // Apply transition only after initial load
    const timer = setTimeout(() => {
      document.body.style.transition = 'background-color 0.3s ease';
    }, 100);
    
    return () => clearTimeout(timer);
  }, [themeMode]);

  const theme = useMemo<Theme>(
    () =>
      createTheme({
        palette: {
          mode: themeMode,
          background: {
            default: themeMode === "dark" ? "#141829" : "#f5f5f5",
            paper: themeMode === "dark" ? "#1a1f3c" : "#fafafa",
          },
          text: {
            primary: themeMode === "dark" ? "#E0E0E0" : "#333",
            secondary: themeMode === "dark" ? "#A0A0A0" : "#666",
          },
          primary: {
            main: "#4caf50",
            light: "#6bc06f",
            dark: "#357a38",
          },
          secondary: {
            main: "#f44336",
            light: "#f6685e",
            dark: "#aa2e25",
          },
          divider: themeMode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        },
        typography: {
          fontFamily: "'Exo 2', 'Roboto', Helvetica, Arial, sans-serif",
          h1: {
            color: themeMode === "dark" ? "#E0E0E0" : "#333",
          },
          h2: {
            color: themeMode === "dark" ? "#E0E0E0" : "#333",
          },
          h3: {
            color: themeMode === "dark" ? "#E0E0E0" : "#333",
          },
          h4: {
            color: themeMode === "dark" ? "#E0E0E0" : "#333",
          },
          h5: {
            color: themeMode === "dark" ? "#E0E0E0" : "#333",
          },
          h6: {
            color: themeMode === "dark" ? "#E0E0E0" : "#333",
          },
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: `
              body {
                transition: background-color 0.3s ease;
                background-color: ${themeMode === "dark" ? "#141829" : "#f5f5f5"};
                color: ${themeMode === "dark" ? "#E0E0E0" : "#333"};
                min-height: 100vh;
              }
              
              #root {
                min-height: 100vh;
                background-color: ${themeMode === "dark" ? "#141829" : "#f5f5f5"};
                transition: background-color 0.3s ease;
              }
            `,
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                transition: 'all 0.3s ease',
                backgroundColor: themeMode === "dark" ? "#1a1f3c" : "#fafafa",
                '&:hover': {
                  backgroundColor: themeMode === "dark" ? "#1f2547" : "#f5f5f5",
                  boxShadow: themeMode === "dark" ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.1)',
                },
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                borderRadius: 8,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-1px)',
                },
              },
            },
          },
          MuiIconButton: {
            styleOverrides: {
              root: {
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  backgroundColor: themeMode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.04)",
                },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                backgroundColor: themeMode === "dark" ? "#1a1f3c" : "#fafafa",
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: themeMode === "dark" ? "#1f2547" : "#f5f5f5",
                  boxShadow: themeMode === "dark" ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.1)',
                },
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: themeMode === "dark" ? "#1a1f3c" : "#fafafa",
                boxShadow: themeMode === "dark" ? '0 2px 10px rgba(0, 0, 0, 0.3)' : '0 2px 10px rgba(0, 0, 0, 0.1)',
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                backgroundColor: themeMode === "dark" ? "#1a1f3c" : "#fafafa",
              },
            },
          },
          MuiListItem: {
            styleOverrides: {
              root: {
                '&:hover': {
                  backgroundColor: themeMode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.04)",
                },
              },
            },
          },
        },
      }),
    [themeMode]
  );

  return (
    <CustomThemeContext.Provider value={{ currentTheme: themeMode, setTheme: setThemeMode }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </CustomThemeContext.Provider>
  );
};

