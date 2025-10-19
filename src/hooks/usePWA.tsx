
import { useState, useEffect } from 'react';
import { useFleetNotifications } from '@/components/notifications';

interface PWAInstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAHook {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  promptInstall: () => Promise<void>;
  deferredPrompt: PWAInstallPrompt | null;
}

export const usePWA = (): PWAHook => {
  const [deferredPrompt, setDeferredPrompt] = useState<PWAInstallPrompt | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { showSuccess, showError, showNotification } = useFleetNotifications();

  // Check if device is mobile and potentially installable
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isSamsungBrowser = /SamsungBrowser/i.test(navigator.userAgent);

  useEffect(() => {
    // Check if app is installed
    const checkInstalled = () => {
      const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppMode = (window.navigator as any).standalone === true;
      const isInstalled = isInStandaloneMode || isInWebAppMode;
      
      setIsInstalled(isInstalled);
    };

    checkInstalled();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('🚀 PWA: Install prompt available!', e);
      e.preventDefault();
      setDeferredPrompt(e as PWAInstallPrompt);
      setIsInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('PWA: App was installed');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      
      showSuccess("¡Harvox TMS instalado!", "La aplicación se ha instalado correctamente en tu dispositivo.");
    };

    // Online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      showSuccess("Conexión restaurada", "Harvox TMS está nuevamente en línea.");
    };

    const handleOffline = () => {
      setIsOnline(false);
      showError("Sin conexión", "Harvox TMS funcionará en modo offline con datos guardados.");
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // SERVICE WORKER TEMPORARILY DISABLED FOR DEBUGGING
    // Uncomment the lines below once the loading issues are resolved
    /*
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('PWA: Service Worker registered successfully:', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  showNotification(
                    'info',
                    "🚀 Nueva versión disponible",
                    "Harvox TMS se ha actualizado. Haz clic en 'Actualizar' para usar la nueva versión.",
                    {
                      persistent: true,
                      showAction: true,
                      actionText: "Actualizar",
                      onAction: () => {
                        window.location.reload();
                      }
                    }
                  );
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('PWA: Service Worker registration failed:', error);
        });
    }
    */

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showSuccess, showError, showNotification]);

  const promptInstall = async (): Promise<void> => {
    if (!deferredPrompt) {
      showError("Instalación no disponible", "La instalación no está disponible en este momento o ya está instalada.");
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('PWA: User accepted the install prompt');
      } else {
        console.log('PWA: User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error('PWA: Error during install prompt:', error);
      showError("Error de instalación", "No se pudo completar la instalación. Inténtalo de nuevo.");
    }
  };

  return {
    isInstallable,
    isInstalled,
    isOnline,
    promptInstall,
    deferredPrompt,
  };
};
