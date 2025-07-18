import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Download, Smartphone } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export const PWAInstallBanner: React.FC = () => {
  console.log('📱 PWAInstallBanner rendering');
  
  const { isInstallable, isInstalled, promptInstall } = usePWA();
  const [dismissed, setDismissed] = React.useState(false);

  // Check if it's a mobile device that might support PWA installation
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isSamsungBrowser = /SamsungBrowser/i.test(navigator.userAgent);
  
  // Samsung Browser often doesn't fire beforeinstallprompt, so show manual instructions
  const showManualInstructions = isMobile && (!isInstallable && !isInstalled);

  // Don't show if already installed or dismissed
  if (isInstalled || dismissed) {
    console.log('📱 PWA Banner: Not showing - installed or dismissed', { isInstalled, dismissed });
    return null;
  }

  // Don't show on desktop unless explicitly installable
  if (!isMobile && !isInstallable) {
    console.log('📱 PWA Banner: Not showing - desktop and not installable');
    return null;
  }

  console.log('📱 PWA Banner: Showing banner', {
    isMobile,
    isIOS,
    isAndroid,
    isSamsungBrowser,
    isInstallable,
    showManualInstructions
  });

  const handleInstall = async () => {
    if (isInstallable && promptInstall) {
      await promptInstall();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  // Show manual instructions for browsers that don't support beforeinstallprompt
  if (showManualInstructions) {
    return (
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground mb-2">
                ¡Instala FleetNest!
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                {isAndroid && (
                  <p>• Toca el menú (⋮) y selecciona "Agregar a pantalla de inicio"</p>
                )}
                {isIOS && (
                  <p>• Toca el botón compartir (□↗) y "Agregar a pantalla de inicio"</p>
                )}
                {isSamsungBrowser && (
                  <p>• Toca el menú (≡) y selecciona "Agregar página a" → "Pantalla de inicio"</p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show automatic install button if prompt is available
  return (
    <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                ¡Instala FleetNest!
              </p>
              <p className="text-xs text-muted-foreground">
                Accede rápidamente desde tu pantalla de inicio
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              onClick={handleInstall}
              className="h-8 text-xs font-medium"
            >
              <Download className="h-3 w-3 mr-1" />
              Instalar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};