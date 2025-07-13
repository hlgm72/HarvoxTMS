import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  useEffect(() => {
    // Check if app is installed
    const checkInstalled = () => {
      const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppMode = (window.navigator as any).standalone === true;
      setIsInstalled(isInStandaloneMode || isInWebAppMode);
    };

    checkInstalled();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('PWA: Install prompt available');
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
      
      toast({
        title: "¡FleetNest instalado!",
        description: "La aplicación se ha instalado correctamente en tu dispositivo.",
      });
    };

    // Online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Conexión restaurada",
        description: "FleetNest está nuevamente en línea.",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Sin conexión",
        description: "FleetNest funcionará en modo offline con datos guardados.",
        variant: "destructive",
      });
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register service worker
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
                  toast({
                    title: "Actualización disponible",
                    description: "Una nueva versión de FleetNest está lista. Refresca la página para usar la versión más reciente.",
                  });
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('PWA: Service Worker registration failed:', error);
        });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  const promptInstall = async (): Promise<void> => {
    if (!deferredPrompt) {
      toast({
        title: "Instalación no disponible",
        description: "La instalación no está disponible en este momento o ya está instalada.",
        variant: "destructive",
      });
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
      toast({
        title: "Error de instalación",
        description: "No se pudo completar la instalación. Inténtalo de nuevo.",
        variant: "destructive",
      });
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