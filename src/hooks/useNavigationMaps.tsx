import { useCallback } from 'react';
import { useFleetNotifications } from '@/components/notifications';
import { useTranslation } from 'react-i18next';

interface NavigationMapsOptions {
  preferredApp?: 'google' | 'apple' | 'waze' | 'auto';
  transportMode?: 'driving' | 'walking' | 'transit';
}

export const useNavigationMaps = (options: NavigationMapsOptions = {}) => {
  const { showError, showSuccess } = useFleetNotifications();
  const { t } = useTranslation('common');
  const { preferredApp = 'auto', transportMode = 'driving' } = options;

  const openInMaps = useCallback((address: string, destinationName?: string) => {
    if (!address || address.trim() === '') {
      showError(t('navigation.invalid_address'), t('navigation.address_required'));
      return;
    }

    try {
      const encodedAddress = encodeURIComponent(address.trim());
      const label = destinationName ? encodeURIComponent(destinationName) : '';
      
      // Detect platform and preferred app
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      let mapUrl: string;

      // Choose navigation app based on platform and preference
      if (preferredApp === 'apple' && isIOS) {
        // Apple Maps (iOS only)
        mapUrl = `maps://?q=${encodedAddress}&dirflg=d`;
      } else if (preferredApp === 'waze') {
        // Waze
        mapUrl = `waze://?q=${encodedAddress}&navigate=yes`;
      } else if (preferredApp === 'google' || preferredApp === 'auto') {
        // Google Maps (universal)
        if (isIOS || isAndroid) {
          // Native Google Maps app
          mapUrl = `comgooglemaps://?q=${encodedAddress}&directionsmode=${transportMode}`;
        } else {
          // Web Google Maps
          mapUrl = `https://maps.google.com/maps?q=${encodedAddress}&t=m`;
        }
      } else {
        // Fallback to web Google Maps
        mapUrl = `https://maps.google.com/maps?q=${encodedAddress}&t=m`;
      }

      // Try to open in native app first, fallback to web
      const link = document.createElement('a');
      link.href = mapUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      // For mobile, try to open native app
      if (isIOS || isAndroid) {
        // Try to open native app directly without iframe to avoid CORB errors
        const appWindow = window.open(mapUrl, '_blank', 'noopener,noreferrer');
        
        // Fallback to web after short delay if native app doesn't open
        setTimeout(() => {
          // Only open fallback if the native app didn't open
          if (appWindow && appWindow.closed) {
            const webUrl = `https://maps.google.com/maps?q=${encodedAddress}&t=m`;
            window.open(webUrl, '_blank', 'noopener,noreferrer');
          }
        }, 1000);
      } else {
        // Desktop - open web maps directly
        link.click();
      }

      showSuccess(
        t('navigation.opening_maps'),
        destinationName || address
      );

    } catch (error) {
      console.error('Error opening maps:', error);
      
      // Ultimate fallback - Google Maps web
      const fallbackUrl = `https://maps.google.com/maps?q=${encodeURIComponent(address)}`;
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      
      showError(
        t('navigation.fallback_used'),
        t('navigation.opened_web_maps')
      );
    }
  }, [preferredApp, transportMode, showError, showSuccess, t]);

  const openRouteFromCurrentLocation = useCallback((
    destination: string, 
    destinationName?: string
  ) => {
    if (!navigator.geolocation) {
      openInMaps(destination, destinationName);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const origin = `${latitude},${longitude}`;
        const dest = encodeURIComponent(destination);
        
        // Open route with current location as origin
        const routeUrl = `https://maps.google.com/maps?saddr=${origin}&daddr=${dest}&dirflg=d`;
        window.open(routeUrl, '_blank', 'noopener,noreferrer');
        
        showSuccess(
          t('navigation.route_opened'),
          `${t('navigation.to')} ${destinationName || destination}`
        );
      },
      (error) => {
        console.error('Geolocation error:', error);
        // Fallback to just destination
        openInMaps(destination, destinationName);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  }, [openInMaps, showSuccess, t]);

  return {
    openInMaps,
    openRouteFromCurrentLocation
  };
};