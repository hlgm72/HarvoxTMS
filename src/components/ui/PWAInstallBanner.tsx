import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Smartphone, Wifi, WifiOff, CheckCircle } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isOnline, promptInstall } = usePWA();

  if (!isInstallable && !isInstalled) {
    return null;
  }

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {isInstalled ? '¡FleetNest está instalado!' : 'Instalar FleetNest'}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                {isInstalled ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Aplicación instalada correctamente
                  </>
                ) : (
                  'Instala FleetNest en tu dispositivo para un acceso más rápido'
                )}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={isOnline ? "default" : "destructive"} className="flex items-center gap-1">
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isOnline ? 'En línea' : 'Sin conexión'}
            </Badge>
            
            {isInstallable && (
              <Button onClick={promptInstall} size="sm" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Instalar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      {!isInstalled && (
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Acceso rápido desde la pantalla de inicio
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Funciona sin conexión a internet
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Notificaciones push (próximamente)
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};