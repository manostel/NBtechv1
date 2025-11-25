/**
 * Utility functions for device detection
 */

/**
 * Detects if the current device is a mobile device
 * @returns {boolean} True if mobile device
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || 
  (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) ||
  ('ontouchstart' in window) ||
  (navigator.maxTouchPoints > 0);
};

/**
 * Detects if the current device supports touch
 * @returns {boolean} True if touch device
 */
export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * Gets optimal zoom configuration based on device type
 * @param {boolean} isMobile - Whether device is mobile
 * @returns {object} Zoom configuration
 */
export const getZoomConfig = (isMobile = false) => {
  if (isMobile) {
    return {
      zoom: {
        wheel: {
          enabled: false, // Disable wheel zoom on mobile
        },
        pinch: {
          enabled: true,
        },
        drag: {
          enabled: false, // Disable drag zoom on mobile (use pinch instead)
        },
        mode: 'x' as const, // Only zoom horizontally on mobile for better UX
        // Don't set speed or other options that might interfere
      },
      pan: {
        enabled: false, // Disable panning on mobile to allow scrolling
        mode: 'x' as const,
        threshold: 10,
      }
    };
  } else {
    return {
      zoom: {
        wheel: {
          enabled: true,
        },
        pinch: {
          enabled: true,
        },
        drag: {
          enabled: true,
        },
        mode: 'xy' as const,
      },
      pan: {
        enabled: true,
        mode: 'x' as const,
      }
    };
  }
};

