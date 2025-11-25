import React, { useState, useEffect, ReactNode } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';

interface PageTransitionProps {
  children: ReactNode;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const theme = useTheme();

  useEffect(() => {
    setIsLoading(true);
    // Short timeout to ensure DOM update has occurred before revealing content
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 50);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <>
      {isLoading && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.palette.mode === 'dark' ? '#1e1e2f' : '#f9f9f9',
            zIndex: 9999,
            opacity: 0.9,
          }}
        >
          <CircularProgress color="primary" />
        </Box>
      )}
      <Box
        sx={{
          visibility: isLoading ? 'hidden' : 'visible',
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.2s ease-in-out',
          backgroundColor: theme.palette.mode === 'dark' ? '#1e1e2f' : '#f9f9f9',
          minHeight: '100vh',
        }}
      >
        {children}
      </Box>
    </>
  );
};

export default PageTransition;

