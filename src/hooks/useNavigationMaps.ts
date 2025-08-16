import { useState } from 'react';
import { Browser } from '@capacitor/browser';
import { Device } from '@capacitor/device';

interface NavigationOptions {
  address?: string;
  city: string;
  state: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
}

export function useNavigationMaps() {
  const [isNavigating, setIsNavigating] = useState(false);

  const formatAddressForMaps = (options: NavigationOptions): string => {
    const parts = [
      options.address,
      options.city,
      options.state,
      options.zipCode
    ].filter(Boolean);
    
    return encodeURIComponent(parts.join(', '));
  };

  const openInMaps = async (options: NavigationOptions) => {
    setIsNavigating(true);
    
    try {
      const deviceInfo = await Device.getInfo();
      const formattedAddress = formatAddressForMaps(options);

      let mapsUrl: string;

      if (deviceInfo.platform === 'ios') {
        // Para iOS, intentar abrir Apple Maps primero
        mapsUrl = `maps://maps.apple.com/?q=${formattedAddress}&dirflg=d`;
        
        try {
          await Browser.open({ url: mapsUrl });
        } catch {
          // Si falla Apple Maps, usar Google Maps
          mapsUrl = `https://maps.google.com/?q=${formattedAddress}&navigate=yes`;
          await Browser.open({ url: mapsUrl });
        }
      } else {
        // Para Android, intentar Google Maps primero
        mapsUrl = `google.navigation:q=${formattedAddress}`;
        
        try {
          await Browser.open({ url: mapsUrl });
        } catch {
          // Si falla la app de Google Maps, usar el navegador
          mapsUrl = `https://maps.google.com/?q=${formattedAddress}&navigate=yes`;
          await Browser.open({ url: mapsUrl });
        }
      }
    } catch (error) {
      console.error('Error opening maps:', error);
      
      // Fallback: abrir en el navegador
      const formattedAddress = formatAddressForMaps(options);
      const fallbackUrl = `https://maps.google.com/?q=${formattedAddress}`;
      window.open(fallbackUrl, '_blank');
    } finally {
      setIsNavigating(false);
    }
  };

  const openInGoogleMaps = async (options: NavigationOptions) => {
    const formattedAddress = formatAddressForMaps(options);
    
    try {
      // Intentar abrir la app de Google Maps
      const googleMapsUrl = `https://maps.google.com/?q=${formattedAddress}&navigate=yes`;
      await Browser.open({ url: googleMapsUrl });
    } catch (error) {
      console.error('Error opening Google Maps:', error);
      // Fallback: abrir en el navegador
      window.open(`https://maps.google.com/?q=${formattedAddress}`, '_blank');
    }
  };

  const openInWaze = async (options: NavigationOptions) => {
    const formattedAddress = formatAddressForMaps(options);
    
    try {
      // Intentar abrir Waze
      const wazeUrl = `https://waze.com/ul?q=${formattedAddress}&navigate=yes`;
      await Browser.open({ url: wazeUrl });
    } catch (error) {
      console.error('Error opening Waze:', error);
      // Fallback: abrir en el navegador
      window.open(`https://waze.com/ul?q=${formattedAddress}`, '_blank');
    }
  };

  return {
    openInMaps,
    openInGoogleMaps,
    openInWaze,
    isNavigating
  };
}