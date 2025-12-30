import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@features': path.resolve(__dirname, './src/features'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@context': path.resolve(__dirname, './src/context'),
      '@stores': path.resolve(__dirname, './src/stores'),
    },
  },
  server: {
    port: 3000,
    open: true,
    // Proxy API calls if needed
    // proxy: {
    //   '/api': {
    //     target: 'https://your-api-gateway.amazonaws.com',
    //     changeOrigin: true,
    //   },
    // },
  },
  build: {
    outDir: 'build', // Keep same output dir for Capacitor compatibility
    sourcemap: true,
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'vendor-charts': ['chart.js', 'react-chartjs-2', 'chartjs-adapter-date-fns'],
        },
      },
    },
  },
  // Base path for Capacitor (relative paths)
  base: './',
  // Define environment variables
  define: {
    'process.env': process.env,
  },
});
