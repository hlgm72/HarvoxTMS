import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFleetNotifications } from '@/components/notifications';
import { useTranslation } from 'react-i18next';

// Global Capacitor interface declaration
declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform(): boolean;
    };
  }
}

// Capacitor types for web compatibility
interface Position {
  timestamp: number;
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number | null;
    speed?: number | null;
    heading?: number | null;
  };
}

interface GPSTrackingState {
  position: Position | null;
  isTracking: boolean;
  isPermissionGranted: boolean;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
}

export const useGPSTracking = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const { t } = useTranslation('common');
  const [state, setState] = useState<GPSTrackingState>({
    position: null,
    isTracking: false,
    isPermissionGranted: false,
    accuracy: null,
    speed: null,
    heading: null
  });

  // Check and request permissions
  const requestPermissions = useCallback(async () => {
    try {
      // Check if we're in a Capacitor environment
      if (window.Capacitor?.isNativePlatform()) {
        const { Geolocation } = await import('@capacitor/geolocation');
        const permissions = await Geolocation.requestPermissions();
        const isGranted = permissions.location === 'granted';
        
        setState(prev => ({ ...prev, isPermissionGranted: isGranted }));
        
        if (!isGranted) {
          showError(t("tracking.permissions_required"), t("tracking.permissions_required_desc"));
        }
        
        return isGranted;
      } else {
        // Web environment - check navigator.geolocation
        if (!navigator.geolocation) {
          showError(t("tracking.geolocation_unavailable"), t("tracking.geolocation_unavailable_desc"));
          return false;
        }
        
        // For web, we assume permission is granted if geolocation is available
        setState(prev => ({ ...prev, isPermissionGranted: true }));
        return true;
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      showError(t("tracking.permissions_error"), t("tracking.permissions_error_desc"));
      return false;
    }
  }, [showError]);

  // Get current position
  const getCurrentPosition = useCallback(async () => {
    try {
      let position: Position;
      
      if (window.Capacitor?.isNativePlatform()) {
        const { Geolocation } = await import('@capacitor/geolocation');
        position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      } else {
        // Use web Geolocation API
        const webPosition = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          });
        });
        
        // Convert web position to our format
        position = {
          timestamp: webPosition.timestamp,
          coords: {
            latitude: webPosition.coords.latitude,
            longitude: webPosition.coords.longitude,
            accuracy: webPosition.coords.accuracy,
            altitude: webPosition.coords.altitude,
            speed: webPosition.coords.speed,
            heading: webPosition.coords.heading
          }
        };
      }
      
      setState(prev => ({ 
        ...prev, 
        position,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed,
        heading: position.coords.heading
      }));
      
      return position;
    } catch (error) {
      console.error('Error getting position:', error);
      showError(t("tracking.location_error"), t("tracking.location_error_desc"));
      return null;
    }
  }, [showError]);

  // Save location to database
  const saveLocationToDatabase = useCallback(async (position: Position) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('equipment_locations')
        .insert({
          equipment_id: user.id, // Usando user ID como equipment_id temporalmente
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          location_type: 'gps_mobile',
          reported_at: new Date().toISOString(),
          reported_by: user.id,
          is_current: true,
          address: `${position.coords.latitude}, ${position.coords.longitude}`,
          notes: `Accuracy: ${position.coords.accuracy}m, Speed: ${position.coords.speed || 0}km/h`
        });

      if (error) {
        console.error('Error saving location:', error);
      }
    } catch (error) {
      console.error('Error saving to database:', error);
    }
  }, [user]);

  // Start tracking
  const startTracking = useCallback(async () => {
    if (!state.isPermissionGranted) {
      const granted = await requestPermissions();
      if (!granted) return;
    }

    try {
      let watchId: string | number;
      
      if (window.Capacitor?.isNativePlatform()) {
        const { Geolocation } = await import('@capacitor/geolocation');
        watchId = await Geolocation.watchPosition({
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 30000
        }, (position, err) => {
          if (err) {
            console.error('Watch position error:', err);
            return;
          }

          if (position) {
            setState(prev => ({ 
              ...prev, 
              position,
              accuracy: position.coords.accuracy,
              speed: position.coords.speed,
              heading: position.coords.heading
            }));
            
            saveLocationToDatabase(position);
          }
        });
      } else {
        // Use web Geolocation API
        watchId = navigator.geolocation.watchPosition(
          (webPosition) => {
            const position: Position = {
              timestamp: webPosition.timestamp,
              coords: {
                latitude: webPosition.coords.latitude,
                longitude: webPosition.coords.longitude,
                accuracy: webPosition.coords.accuracy,
                altitude: webPosition.coords.altitude,
                speed: webPosition.coords.speed,
                heading: webPosition.coords.heading
              }
            };
            
            setState(prev => ({ 
              ...prev, 
              position,
              accuracy: position.coords.accuracy,
              speed: position.coords.speed,
              heading: position.coords.heading
            }));
            
            saveLocationToDatabase(position);
          },
          (error) => {
            console.error('Watch position error:', error);
          },
          {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 30000
          }
        );
      }

      setState(prev => ({ ...prev, isTracking: true }));
      
      showSuccess(t("tracking.tracking_started"), t("tracking.tracking_started_desc"));

      return watchId.toString();
    } catch (error) {
      console.error('Error starting tracking:', error);
      showError(t("tracking.tracking_error"), t("tracking.tracking_error_desc"));
    }
  }, [state.isPermissionGranted, requestPermissions, saveLocationToDatabase, showSuccess, showError]);

  // Stop tracking
  const stopTracking = useCallback(async (watchId: string) => {
    try {
      if (window.Capacitor?.isNativePlatform()) {
        const { Geolocation } = await import('@capacitor/geolocation');
        await Geolocation.clearWatch({ id: watchId });
      } else {
        navigator.geolocation.clearWatch(parseInt(watchId));
      }
      
      setState(prev => ({ ...prev, isTracking: false }));
      
      showSuccess(t("tracking.tracking_stopped"), t("tracking.tracking_stopped_desc"));
    } catch (error) {
      console.error('Error stopping tracking:', error);
    }
  }, [showSuccess]);

  // Check permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        if (window.Capacitor?.isNativePlatform()) {
          const { Geolocation } = await import('@capacitor/geolocation');
          const permissions = await Geolocation.checkPermissions();
          setState(prev => ({ 
            ...prev, 
            isPermissionGranted: permissions.location === 'granted' 
          }));
        } else {
          // For web, check if geolocation is available
          const isAvailable = !!navigator.geolocation;
          setState(prev => ({ 
            ...prev, 
            isPermissionGranted: isAvailable 
          }));
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
      }
    };

    checkPermissions();
  }, []);

  return {
    ...state,
    requestPermissions,
    getCurrentPosition,
    startTracking,
    stopTracking,
    saveLocationToDatabase
  };
};