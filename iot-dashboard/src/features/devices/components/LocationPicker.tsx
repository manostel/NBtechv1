import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in Leaflet with webpack
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LocationPickerProps {
  open: boolean;
  onClose: () => void;
  deviceName: string;
  clientId: string;
  currentLocation?: { lat: number; lng: number };
  onSave: (location: { lat: number; lng: number }) => Promise<void>;
}

// Component to handle map clicks
function LocationMarker({ position, setPosition }: { position: [number, number] | null; setPosition: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position ? <Marker position={position} /> : null;
}

// Component to center map on current location when dialog opens
function MapCenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);

  return null;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  open,
  onClose,
  deviceName,
  clientId,
  currentLocation,
  onSave
}) => {
  const theme = useTheme();
  const [position, setPosition] = useState<[number, number] | null>(
    currentLocation ? [currentLocation.lat, currentLocation.lng] : null
  );
  const [manualLat, setManualLat] = useState<string>(currentLocation?.lat.toString() || '');
  const [manualLng, setManualLng] = useState<string>(currentLocation?.lng.toString() || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update position when current location changes
  useEffect(() => {
    if (currentLocation) {
      setPosition([currentLocation.lat, currentLocation.lng]);
      setManualLat(currentLocation.lat.toString());
      setManualLng(currentLocation.lng.toString());
    }
  }, [currentLocation]);

  // Update position when manual entry changes
  useEffect(() => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      setPosition([lat, lng]);
    }
  }, [manualLat, manualLng]);

  const handlePositionChange = (newPosition: [number, number]) => {
    setPosition(newPosition);
    setManualLat(newPosition[0].toFixed(6));
    setManualLng(newPosition[1].toFixed(6));
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPos: [number, number] = [position.coords.latitude, position.coords.longitude];
          handlePositionChange(newPos);
        },
        (error) => {
          setError('Could not get your current location. Please check browser permissions.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  const handleSave = async () => {
    if (!position) {
      setError('Please select a location on the map or enter coordinates.');
      return;
    }

    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || isNaN(lng)) {
      setError('Invalid coordinates. Please check your input.');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError('Coordinates out of range. Latitude: -90 to 90, Longitude: -180 to 180.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({ lat, lng });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  // Determine map center and zoom based on current location or position
  const mapCenter: [number, number] = position || (currentLocation ? [currentLocation.lat, currentLocation.lng] : [37.9838, 23.7275]);
  const mapZoom = (position || currentLocation) ? 15 : 13; // Zoom in more if we have a location

  // Center map when dialog opens or current location changes
  useEffect(() => {
    if (open && currentLocation) {
      setPosition([currentLocation.lat, currentLocation.lng]);
      setManualLat(currentLocation.lat.toString());
      setManualLng(currentLocation.lng.toString());
    }
  }, [open, currentLocation]);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.98) 0%, rgba(31, 37, 71, 0.98) 50%, rgba(26, 31, 60, 0.98) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 50%, rgba(255, 255, 255, 0.98) 100%)',
          backdropFilter: 'blur(12px)',
          boxShadow: theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.12)',
          border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
        }
      }}
    >
      <DialogTitle sx={{ 
        color: theme.palette.text.primary,
        borderBottom: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
        pb: 2
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ color: theme.palette.text.primary }}>
            Set Location for {deviceName}
          </Typography>
          <IconButton 
            onClick={onClose} 
            size="small"
            sx={{ 
              color: theme.palette.text.secondary,
              '&:hover': {
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ 
        bgcolor: 'transparent',
        color: theme.palette.text.primary 
      }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {error && (
            <Alert 
              severity="error" 
              onClose={() => setError(null)}
              sx={{
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(244, 67, 54, 0.2)' : 'rgba(244, 67, 54, 0.1)',
                color: theme.palette.text.primary,
                border: theme.palette.mode === 'dark' ? '1px solid rgba(244, 67, 54, 0.3)' : '1px solid rgba(244, 67, 54, 0.2)'
              }}
            >
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              label="Latitude"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              type="number"
              inputProps={{ step: 0.000001, min: -90, max: 90 }}
              fullWidth
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                  color: theme.palette.text.primary,
                  '& fieldset': {
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)',
                  },
                  '&:hover fieldset': {
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: theme.palette.primary.main,
                  },
                },
                '& .MuiInputLabel-root': {
                  color: theme.palette.text.secondary,
                },
              }}
            />
            <TextField
              label="Longitude"
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              type="number"
              inputProps={{ step: 0.000001, min: -180, max: 180 }}
              fullWidth
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                  color: theme.palette.text.primary,
                  '& fieldset': {
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)',
                  },
                  '&:hover fieldset': {
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: theme.palette.primary.main,
                  },
                },
                '& .MuiInputLabel-root': {
                  color: theme.palette.text.secondary,
                },
              }}
            />
            <Tooltip title="Use my current location">
              <IconButton 
                onClick={handleUseCurrentLocation} 
                color="primary"
                sx={{
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.2)' : 'rgba(33, 150, 243, 0.1)',
                  '&:hover': {
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.3)' : 'rgba(33, 150, 243, 0.2)',
                  }
                }}
              >
                <MyLocationIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            Click on the map to set the device location, or enter coordinates manually above.
          </Typography>

          <Box sx={{ 
            height: 400, 
            width: '100%', 
            borderRadius: 1, 
            overflow: 'hidden',
            border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.12)',
            boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
            filter: theme.palette.mode === 'dark' ? 'brightness(0.8) contrast(1.2)' : 'none'
          }}>
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              key={`${mapCenter[0]}-${mapCenter[1]}`}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapCenter center={mapCenter} zoom={mapZoom} />
              <LocationMarker position={position} setPosition={handlePositionChange} />
            </MapContainer>
          </Box>

          {position && (
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              Selected: {position[0].toFixed(6)}, {position[1].toFixed(6)}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ 
        borderTop: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
        pt: 2,
        px: 3,
        pb: 2
      }}>
        <Button 
          onClick={onClose} 
          disabled={saving}
          sx={{
            color: theme.palette.text.secondary,
            '&:hover': {
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)'
            }
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || !position}
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null}
          sx={{
            bgcolor: theme.palette.primary.main,
            '&:hover': {
              bgcolor: theme.palette.primary.dark,
            },
            '&:disabled': {
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)',
              color: theme.palette.text.disabled,
            }
          }}
        >
          {saving ? 'Saving...' : 'Save Location'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

