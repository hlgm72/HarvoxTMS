import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Activity, RefreshCw, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface VehiclePosition {
  id: string;
  vehicle_name: string;
  latitude: number;
  longitude: number;
  speed: number;
  bearing: number;
  last_update: string;
  status: 'active' | 'idle' | 'offline';
}

export function CommandMap() {
  const { userRole } = useAuth();
  const [vehicles, setVehicles] = useState<VehiclePosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchVehiclePositions = async () => {
    if (!userRole?.company_id) return;

    try {
      setLoading(true);
      
      // Obtener vehículos de la empresa desde Geotab
      const { data: geotabVehicles, error: vehiclesError } = await supabase
        .from('geotab_vehicles')
        .select('*')
        .limit(20);

      if (vehiclesError) {
        console.error('Error fetching vehicles:', vehiclesError);
        return;
      }

      if (!geotabVehicles || geotabVehicles.length === 0) {
        setVehicles([]);
        return;
      }

      // Obtener las últimas posiciones de cada vehículo
      const vehiclePositions = await Promise.all(
        geotabVehicles.map(async (vehicle) => {
          const { data: positions, error: posError } = await supabase
            .from('geotab_vehicle_positions')
            .select('*')
            .eq('vehicle_id', vehicle.id)
            .order('date_time', { ascending: false })
            .limit(1);

          if (posError || !positions || positions.length === 0) {
            return null;
          }

          const latestPosition = positions[0];
          const lastUpdateTime = new Date(latestPosition.date_time);
          const timeDiff = Date.now() - lastUpdateTime.getTime();
          
          // Determinar estado basado en tiempo transcurrido y velocidad
          let status: 'active' | 'idle' | 'offline' = 'offline';
          if (timeDiff < 10 * 60 * 1000) { // Menos de 10 minutos
            status = latestPosition.speed > 5 ? 'active' : 'idle';
          }

          return {
            id: vehicle.id,
            vehicle_name: vehicle.name,
            latitude: latestPosition.latitude,
            longitude: latestPosition.longitude,
            speed: latestPosition.speed || 0,
            bearing: latestPosition.bearing || 0,
            last_update: latestPosition.date_time,
            status
          };
        })
      );

      const validPositions = vehiclePositions.filter(Boolean) as VehiclePosition[];
      setVehicles(validPositions);
      setLastUpdate(new Date());
      
    } catch (error) {
      console.error('Error fetching vehicle positions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehiclePositions();
    
    // Actualizar posiciones cada 30 segundos
    const interval = setInterval(fetchVehiclePositions, 30000);
    
    return () => clearInterval(interval);
  }, [userRole?.company_id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'En movimiento';
      case 'idle': return 'Detenido';
      case 'offline': return 'Sin conexión';
      default: return 'Desconocido';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Seguimiento de Flota en Tiempo Real</h3>
          <p className="text-sm text-muted-foreground">
            {lastUpdate ? `Última actualización: ${lastUpdate.toLocaleTimeString()}` : 'Cargando...'}
          </p>
        </div>
        <Button onClick={fetchVehiclePositions} disabled={loading} size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Mapa simplificado con lista de vehículos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vista del mapa (placeholder mejorado) */}
        <Card className="lg:col-span-2 h-[400px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Mapa de Ubicaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-full flex items-center justify-center bg-muted/30 rounded-lg">
              <div className="text-center">
                <div className="text-6xl mb-4">🗺️</div>
                <h4 className="text-lg font-medium mb-2">Integración de Mapa</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  La vista interactiva del mapa estará disponible próximamente
                </p>
                <p className="text-xs text-muted-foreground">
                  Se mostrará: {vehicles.length} vehículos rastreados
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de vehículos */}
        <Card className="h-[400px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Estado de Vehículos ({vehicles.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[320px] overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Cargando vehículos...</p>
                </div>
              ) : vehicles.length === 0 ? (
                <div className="p-6 text-center">
                  <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No hay vehículos conectados</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Conecta tu sistema Geotab para ver el tracking
                  </p>
                </div>
              ) : (
                vehicles.map((vehicle) => (
                  <div key={vehicle.id} className="p-4 border-b border-border last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm truncate flex-1">{vehicle.vehicle_name}</h4>
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(vehicle.status)}`}></div>
                    </div>
                    
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Estado:</span>
                        <Badge variant="outline" className="text-xs">
                          {getStatusText(vehicle.status)}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Velocidad:</span>
                        <span>{Math.round(vehicle.speed)} km/h</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Ubicación:</span>
                        <span>{vehicle.latitude.toFixed(4)}, {vehicle.longitude.toFixed(4)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Última actualización:</span>
                        <span>{new Date(vehicle.last_update).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {vehicles.filter(v => v.status === 'active').length}
            </div>
            <p className="text-sm text-muted-foreground">En movimiento</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {vehicles.filter(v => v.status === 'idle').length}
            </div>
            <p className="text-sm text-muted-foreground">Detenidos</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">
              {vehicles.filter(v => v.status === 'offline').length}
            </div>
            <p className="text-sm text-muted-foreground">Sin conexión</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {vehicles.reduce((avg, v) => avg + v.speed, 0) / (vehicles.length || 1)}
            </div>
            <p className="text-sm text-muted-foreground">Velocidad promedio</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}