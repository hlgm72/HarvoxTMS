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

      // Usar URLs universales que permiten al usuario elegir la app
      let mapsUrl: string;

      if (options.latitude && options.longitude) {
        // Si tenemos coordenadas, usar geo: que es universal
        mapsUrl = `geo:${options.latitude},${options.longitude}?q=${formattedAddress}`;
      } else {
        // URL universal de Google Maps que activa el selector de apps
        mapsUrl = `https://maps.google.com/maps?daddr=${formattedAddress}`;
      }

      // Browser.open con toolbarColor para mejor experiencia
      await Browser.open({ 
        url: mapsUrl,
        toolbarColor: '#000000'
      });
      
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