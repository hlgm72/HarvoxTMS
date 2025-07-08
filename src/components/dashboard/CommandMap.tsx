import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Vehicle {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
  bearing?: number;
  odometer?: number;
  driver_name?: string;
  status: string;
  last_update?: string;
}

interface VehiclePosition {
  vehicle_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  bearing: number;
  date_time: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "en_route": return "primary";
    case "loading": return "warning";
    case "delivered": return "success";
    case "maintenance": return "destructive";
    default: return "secondary";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "en_route": return "En Ruta";
    case "loading": return "Cargando";
    case "delivered": return "Entregado";
    case "maintenance": return "Mantenimiento";
    default: return status;
  }
};

export function CommandMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<string>('');

  // Load vehicles from database
  const loadVehicles = async () => {
    try {
      const { data: vehicleData, error } = await supabase
        .from('vehicles')
        .select(`
          id,
          name,
          geotab_id,
          license_plate,
          vehicle_positions (
            latitude,
            longitude,
            speed,
            bearing,
            odometer,
            date_time
          )
        `)
        .order('name');

      if (error) throw error;

      const vehiclesWithPositions = vehicleData?.map(vehicle => {
        const latestPosition = vehicle.vehicle_positions?.[0];
        return {
          id: vehicle.id,
          name: vehicle.name,
          latitude: latestPosition?.latitude,
          longitude: latestPosition?.longitude,
          speed: latestPosition?.speed,
          bearing: latestPosition?.bearing,
          odometer: latestPosition?.odometer,
          status: latestPosition ? "en_route" : "offline",
          last_update: latestPosition?.date_time
        };
      }) || [];

      setVehicles(vehiclesWithPositions);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  // Sync data from Geotab
  const syncGeotabData = async (action = 'sync-all') => {
    try {
      setSyncStatus(`Sincronizando ${action}...`);
      const { data, error } = await supabase.functions.invoke('geotab-sync', {
        body: { action }
      });

      if (error) throw error;

      setSyncStatus('Sincronización exitosa');
      await loadVehicles();
      
      setTimeout(() => setSyncStatus(''), 3000);
    } catch (error) {
      console.error('Error syncing Geotab data:', error);
      setSyncStatus('Error en sincronización');
      setTimeout(() => setSyncStatus(''), 3000);
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-99.1332, 19.4326], // Mexico City center
      zoom: 5
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken]);

  // Add vehicle markers to map
  useEffect(() => {
    if (!map.current || vehicles.length === 0) return;

    // Clear existing markers
    const existingMarkers = document.querySelectorAll('.vehicle-marker');
    existingMarkers.forEach(marker => marker.remove());

    vehicles.forEach(vehicle => {
      if (vehicle.latitude && vehicle.longitude) {
        const el = document.createElement('div');
        el.className = 'vehicle-marker';
        el.style.cssText = `
          width: 12px;
          height: 12px;
          background-color: ${vehicle.status === 'en_route' ? '#10b981' : '#ef4444'};
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          cursor: pointer;
        `;

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2">
            <h4 class="font-semibold">${vehicle.name}</h4>
            <p class="text-sm">Velocidad: ${vehicle.speed || 0} km/h</p>
            <p class="text-sm">Odómetro: ${vehicle.odometer || 0} km</p>
            <p class="text-sm text-gray-500">${vehicle.last_update ? new Date(vehicle.last_update).toLocaleString() : 'Sin datos'}</p>
          </div>
        `);

        new mapboxgl.Marker(el)
          .setLngLat([vehicle.longitude, vehicle.latitude])
          .setPopup(popup)
          .addTo(map.current!);
      }
    });
  }, [vehicles]);

  // Real-time position updates
  useEffect(() => {
    const channel = supabase
      .channel('vehicle-positions')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'vehicle_positions' },
        () => { loadVehicles(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Load initial data
  useEffect(() => {
    loadVehicles().finally(() => setIsLoading(false));
  }, []);

  const handleMapboxTokenSubmit = (token: string) => {
    setMapboxToken(token);
  };

  if (!mapboxToken) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle>🗺️ Configuración del Mapa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Para mostrar el mapa en tiempo real, necesitas un token público de Mapbox:
            </p>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Ingresa tu Mapbox token público..."
                className="w-full p-2 border rounded"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleMapboxTokenSubmit((e.target as HTMLInputElement).value);
                  }
                }}
              />
              <Button
                onClick={() => {
                  const input = document.querySelector('input') as HTMLInputElement;
                  if (input?.value) {
                    handleMapboxTokenSubmit(input.value);
                  }
                }}
                className="w-full"
              >
                Configurar Mapa
              </Button>
            </div>
            <a 
              href="https://account.mapbox.com/access-tokens/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              → Obtener token en Mapbox
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            🗺️ Mapa de Comando en Tiempo Real
            <Badge variant="outline" className="bg-fleet-green/10 text-fleet-green border-fleet-green/20 animate-pulse">
              LIVE
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncGeotabData('sync-vehicles')}
              disabled={!!syncStatus}
            >
              🚛 Sync Vehículos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncGeotabData('sync-positions')}
              disabled={!!syncStatus}
            >
              📍 Sync Posiciones
            </Button>
          </div>
        </CardTitle>
        {syncStatus && (
          <p className="text-sm text-muted-foreground">{syncStatus}</p>
        )}
      </CardHeader>
      <CardContent>
        {/* Real Mapbox Map */}
        <div className="relative h-64 rounded-lg border overflow-hidden mb-4">
          <div ref={mapContainer} className="w-full h-full" />
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Cargando vehículos...</p>
            </div>
          )}
        </div>

        {/* Vehicle List */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground mb-3">
            Vehículos Activos ({vehicles.length})
          </h4>
          {vehicles.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <p>No hay vehículos sincronizados.</p>
              <p className="text-xs">Haz clic en "Sync Vehículos" para sincronizar desde Geotab.</p>
            </div>
          ) : (
            vehicles.map((vehicle) => (
              <div key={vehicle.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{vehicle.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {vehicle.latitude && vehicle.longitude 
                        ? `${vehicle.latitude.toFixed(4)}, ${vehicle.longitude.toFixed(4)}`
                        : 'Sin ubicación'
                      }
                    </span>
                  </div>
                  <Badge variant={getStatusColor(vehicle.status) as any} className="text-xs">
                    {getStatusText(vehicle.status)}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium">
                    {vehicle.speed ? `${vehicle.speed} km/h` : '0 km/h'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {vehicle.odometer ? `${vehicle.odometer} km` : 'N/A'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}