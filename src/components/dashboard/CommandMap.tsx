import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader } from "@googlemaps/js-api-loader";
import { useToast } from "@/hooks/use-toast";

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
    case "offline": return "secondary";
    default: return "secondary";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "en_route": return "En Ruta";
    case "loading": return "Cargando";
    case "delivered": return "Entregado";
    case "maintenance": return "Mantenimiento";
    case "offline": return "Desconectado";
    default: return status;
  }
};

// Convert km/h to mph
const convertToMph = (speedKmh: number | undefined): number => {
  return speedKmh ? Math.round(speedKmh * 0.621371) : 0;
};

export function CommandMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [googleApiKey, setGoogleApiKey] = useState<string>(() => {
    return localStorage.getItem('google-maps-api-key') || '';
  });
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const { toast } = useToast();

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

      // Get the latest position for each vehicle
      const vehiclesWithPositions = vehicleData?.map(vehicle => {
        // Sort positions by date_time to get the most recent (newest first)
        const sortedPositions = vehicle.vehicle_positions?.sort((a, b) => {
          const timeA = new Date(a.date_time).getTime();
          const timeB = new Date(b.date_time).getTime();
          return timeB - timeA; // Newest first
        });
        const latestPosition = sortedPositions?.[0];
        
        console.log('Vehicle positions for', vehicle.name, {
          totalPositions: vehicle.vehicle_positions?.length || 0,
          latestPosition: latestPosition ? {
            lat: latestPosition.latitude,
            lng: latestPosition.longitude,
            time: latestPosition.date_time
          } : null
        });

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
      toast({
        title: "Sincronizando...",
        description: `Iniciando sincronización de ${action}`
      });
      
      // Extended timeout for position sync which is slower
      const timeoutMs = action === 'sync-positions' ? 120000 : 30000; // 2 minutes for positions, 30s for others
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout: Sincronización tardó más de ${timeoutMs/1000} segundos`)), timeoutMs)
      );
      
      const syncPromise = supabase.functions.invoke('geotab-sync', {
        body: { action }
      });
      
      const result = await Promise.race([syncPromise, timeoutPromise]);
      const { data, error } = result as any;

      if (error) {
        console.error('Geotab sync error:', error);
        throw error;
      }

      console.log('Sync result:', data);
      setSyncStatus('');
      
      toast({
        title: "✅ Sincronización exitosa",
        description: data?.message || `${action} completado correctamente`
      });
      
      await loadVehicles();
    } catch (error) {
      console.error('Error syncing Geotab data:', error);
      setSyncStatus('');
      
      toast({
        title: "❌ Error de sincronización",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Initialize Google Maps
  useEffect(() => {
    if (!mapContainer.current || !googleApiKey) return;

    const loader = new Loader({
      apiKey: googleApiKey,
      version: "weekly",
      libraries: ["places"]
    });

    loader.load().then(() => {
      if (mapContainer.current) {
        map.current = new google.maps.Map(mapContainer.current, {
          center: { lat: 19.4326, lng: -99.1332 }, // Mexico City
          zoom: 6,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ]
        });
      }
    }).catch(error => {
      console.error('Error loading Google Maps:', error);
    });

    return () => {
      // Cleanup markers
      markers.current.forEach(marker => marker.setMap(null));
      markers.current = [];
    };
  }, [googleApiKey]);

  // Add vehicle markers to map
  useEffect(() => {
    if (!map.current || vehicles.length === 0) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.setMap(null));
    markers.current = [];

    vehicles.forEach(vehicle => {
      if (vehicle.latitude && vehicle.longitude && map.current) {
        const marker = new google.maps.Marker({
          position: { lat: vehicle.latitude, lng: vehicle.longitude },
          map: map.current,
          title: vehicle.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: vehicle.status === 'en_route' ? '#10b981' : '#ef4444',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          }
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; font-family: system-ui;">
              <h4 style="margin: 0 0 8px 0; font-weight: 600;">${vehicle.name}</h4>
              <p style="margin: 4px 0; font-size: 14px;">Velocidad: ${convertToMph(vehicle.speed)} mph</p>
              <p style="margin: 4px 0; font-size: 14px;">Odómetro: ${vehicle.odometer || 0} km</p>
              <p style="margin: 4px 0; font-size: 12px; color: #666;">
                ${vehicle.last_update ? new Date(vehicle.last_update).toLocaleString() : 'Sin datos'}
              </p>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map.current, marker);
        });

        markers.current.push(marker);
      }
    });

    // Fit map to show all markers
    if (markers.current.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.current.forEach(marker => {
        const position = marker.getPosition();
        if (position) bounds.extend(position);
      });
      map.current.fitBounds(bounds);
    }
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

  const handleGoogleApiKeySubmit = (key: string) => {
    localStorage.setItem('google-maps-api-key', key);
    setGoogleApiKey(key);
  };

  if (!googleApiKey) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle>🗺️ Configuración de Google Maps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Para mostrar el mapa en tiempo real con Google Maps, necesitas una API key:
            </p>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Ingresa tu Google Maps API key..."
                className="w-full p-2 border rounded"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleGoogleApiKeySubmit((e.target as HTMLInputElement).value);
                  }
                }}
              />
              <Button
                onClick={() => {
                  const input = document.querySelector('input[placeholder*="Google Maps API key"]') as HTMLInputElement;
                  if (input?.value) {
                    handleGoogleApiKeySubmit(input.value);
                  }
                }}
                className="w-full"
              >
                Configurar Google Maps
              </Button>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-medium">📋 Pasos para obtener tu API key:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Ve a Google Cloud Console</li>
                <li>Crea un proyecto nuevo o selecciona uno existente</li>
                <li>Habilita "Maps JavaScript API"</li>
                <li>Crea credenciales → API key</li>
                <li>Configura restricciones de dominio (opcional)</li>
              </ol>
              <a 
                href="https://console.cloud.google.com/google/maps-apis/overview" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block text-blue-600 hover:underline"
              >
                → Ir a Google Cloud Console
              </a>
            </div>
            <div className="bg-blue-50 p-3 rounded text-sm">
              <p className="font-medium text-blue-800">💰 Límite gratuito de Google Maps:</p>
              <p className="text-blue-700">28,000 cargas de mapa por mes gratis</p>
            </div>
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
        {/* Google Maps */}
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
                    {convertToMph(vehicle.speed)} mph
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