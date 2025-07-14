import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  Navigation, 
  Gauge, 
  Clock, 
  Phone,
  Settings,
  LogOut,
  Play,
  Pause
} from 'lucide-react';
import { useGPSTracking } from '@/hooks/useGPSTracking';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const DriverTrackingInterface = () => {
  const { 
    position, 
    isTracking, 
    isPermissionGranted, 
    accuracy, 
    speed, 
    heading,
    startTracking,
    stopTracking,
    getCurrentPosition 
  } = useGPSTracking();
  
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [watchId, setWatchId] = useState<string | null>(null);

  const handleStartTracking = async () => {
    const id = await startTracking();
    if (id) {
      setWatchId(id);
    }
  };

  const handleStopTracking = async () => {
    if (watchId) {
      await stopTracking(watchId);
      setWatchId(null);
    }
  };

  const handleGetCurrentLocation = async () => {
    const pos = await getCurrentPosition();
    if (pos) {
      toast({
        title: "Ubicación actualizada",
        description: `Lat: ${pos.coords.latitude.toFixed(6)}, Lng: ${pos.coords.longitude.toFixed(6)}`
      });
    }
  };

  const formatSpeed = (speed: number | null) => {
    if (speed === null) return 'N/A';
    return `${Math.round(speed * 3.6)} km/h`; // Convert m/s to km/h
  };

  const formatHeading = (heading: number | null) => {
    if (heading === null) return 'N/A';
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(heading / 45) % 8;
    return `${Math.round(heading)}° ${directions[index]}`;
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">
            FleetNest Driver
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant={isTracking ? "default" : "secondary"}>
              {isTracking ? "Activo" : "Inactivo"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Conductor: {user?.email}
          </p>
        </CardContent>
      </Card>

      {/* Permission Status */}
      {!isPermissionGranted && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-warning">
              <MapPin className="h-5 w-5" />
              <span className="text-sm">
                Se requieren permisos de ubicación para el rastreo
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tracking Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Navigation className="h-5 w-5" />
            <span>Control de Rastreo</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            {!isTracking ? (
              <Button 
                onClick={handleStartTracking}
                className="flex-1"
                disabled={!isPermissionGranted}
              >
                <Play className="h-4 w-4 mr-2" />
                Iniciar Rastreo
              </Button>
            ) : (
              <Button 
                onClick={handleStopTracking}
                variant="destructive"
                className="flex-1"
              >
                <Pause className="h-4 w-4 mr-2" />
                Detener Rastreo
              </Button>
            )}
            
            <Button 
              onClick={handleGetCurrentLocation}
              variant="outline"
              disabled={!isPermissionGranted}
            >
              <MapPin className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Location Info */}
      {position && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Ubicación Actual</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Latitud</p>
                <p className="font-mono">{position.coords.latitude.toFixed(6)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Longitud</p>
                <p className="font-mono">{position.coords.longitude.toFixed(6)}</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Gauge className="h-4 w-4" />
                  <span>Velocidad</span>
                </div>
                <span className="font-mono">{formatSpeed(speed)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Navigation className="h-4 w-4" />
                  <span>Dirección</span>
                </div>
                <span className="font-mono">{formatHeading(heading)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>Precisión</span>
                </div>
                <span className="font-mono">
                  {accuracy ? `${Math.round(accuracy)}m` : 'N/A'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Última actualización</span>
                </div>
                <span className="text-xs">
                  {new Date(position.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emergency Contact */}
      <Card>
        <CardContent className="pt-6">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => {
              // Implementar llamada de emergencia
              window.open('tel:+1234567890');
            }}
          >
            <Phone className="h-4 w-4 mr-2" />
            Contacto de Emergencia
          </Button>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardContent className="pt-6">
          <Button variant="ghost" className="w-full justify-start">
            <Settings className="h-4 w-4 mr-2" />
            Configuración
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};