import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader } from "@googlemaps/js-api-loader";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

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

const getStatusText = (status: string, t: any) => {
  switch (status) {
    case "en_route": return t('fleet:status.en_route');
    case "loading": return t('fleet:status.loading');
    case "delivered": return t('fleet:status.delivered');
    case "maintenance": return t('fleet:status.maintenance');
    case "offline": return t('fleet:status.offline');
    default: return status;
  }
};

// Convert km/h to mph
const convertToMph = (speedKmh: number | undefined): number => {
  return speedKmh ? Math.round(speedKmh * 0.621371) : 0;
};

// Estado coordinates mapping
const getStateCoordinates = (stateId: string): { lat: number; lng: number } => {
  const stateCoords: { [key: string]: { lat: number; lng: number } } = {
    'AL': { lat: 32.7767, lng: -86.7999 },  // Alabama
    'AK': { lat: 61.2181, lng: -149.9003 }, // Alaska
    'AZ': { lat: 33.7712, lng: -111.3877 }, // Arizona
    'AR': { lat: 34.9513, lng: -92.3809 },  // Arkansas
    'CA': { lat: 36.1162, lng: -119.6816 }, // California
    'CO': { lat: 39.0598, lng: -105.3111 }, // Colorado
    'CT': { lat: 41.5978, lng: -72.7554 },  // Connecticut
    'DE': { lat: 39.3185, lng: -75.5071 },  // Delaware
    'FL': { lat: 27.8006, lng: -81.8168 },  // Florida
    'GA': { lat: 33.0406, lng: -83.6431 },  // Georgia
    'HI': { lat: 21.0943, lng: -157.4983 }, // Hawaii
    'ID': { lat: 44.2405, lng: -114.4788 }, // Idaho
    'IL': { lat: 40.3363, lng: -89.0022 },  // Illinois
    'IN': { lat: 39.8647, lng: -86.2604 },  // Indiana
    'IA': { lat: 42.0115, lng: -93.2105 },  // Iowa
    'KS': { lat: 38.5266, lng: -96.7265 },  // Kansas
    'KY': { lat: 37.6681, lng: -84.6701 },  // Kentucky
    'LA': { lat: 31.1695, lng: -91.8678 },  // Louisiana
    'ME': { lat: 44.6939, lng: -69.3819 },  // Maine
    'MD': { lat: 39.0639, lng: -76.8021 },  // Maryland
    'MA': { lat: 42.2373, lng: -71.5314 },  // Massachusetts
    'MI': { lat: 43.3266, lng: -84.5361 },  // Michigan
    'MN': { lat: 45.7326, lng: -93.9196 },  // Minnesota
    'MS': { lat: 32.7364, lng: -89.6678 },  // Mississippi
    'MO': { lat: 38.4623, lng: -92.3020 },  // Missouri
    'MT': { lat: 47.0527, lng: -110.2143 }, // Montana
    'NE': { lat: 41.1257, lng: -98.2482 },  // Nebraska
    'NV': { lat: 38.3135, lng: -117.0554 }, // Nevada
    'NH': { lat: 43.4525, lng: -71.5639 },  // New Hampshire
    'NJ': { lat: 40.3573, lng: -74.4057 },  // New Jersey
    'NM': { lat: 34.8405, lng: -106.2485 }, // New Mexico
    'NY': { lat: 42.1657, lng: -74.9481 },  // New York
    'NC': { lat: 35.6301, lng: -79.8064 },  // North Carolina
    'ND': { lat: 47.5289, lng: -99.7840 },  // North Dakota
    'OH': { lat: 40.3888, lng: -82.7649 },  // Ohio
    'OK': { lat: 35.5653, lng: -96.9289 },  // Oklahoma
    'OR': { lat: 44.5672, lng: -122.1269 }, // Oregon
    'PA': { lat: 40.5908, lng: -77.2098 },  // Pennsylvania
    'RI': { lat: 41.6809, lng: -71.5118 },  // Rhode Island
    'SC': { lat: 33.8569, lng: -80.9450 },  // South Carolina
    'SD': { lat: 44.2998, lng: -99.4388 },  // South Dakota
    'TN': { lat: 35.7449, lng: -86.7489 },  // Tennessee
    'TX': { lat: 31.0545, lng: -97.5635 },  // Texas
    'UT': { lat: 40.1500, lng: -111.8947 }, // Utah
    'VT': { lat: 44.0459, lng: -72.7107 },  // Vermont
    'VA': { lat: 37.7693, lng: -78.2057 },  // Virginia
    'WA': { lat: 47.4009, lng: -121.4905 }, // Washington
    'WV': { lat: 38.4912, lng: -80.9540 },  // West Virginia
    'WI': { lat: 44.2685, lng: -89.6165 },  // Wisconsin
    'WY': { lat: 42.7559, lng: -107.3025 }  // Wyoming
  };
  
  return stateCoords[stateId] || { lat: 39.8283, lng: -98.5795 }; // Default to US center
};

export function CommandMap() {
  const { t } = useTranslation(['common', 'fleet']);
  const { userRole } = useAuth();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [googleApiKey, setGoogleApiKey] = useState<string>(() => {
    return localStorage.getItem('google-maps-api-key') || '';
  });
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const { toast } = useToast();

  // Fetch company information
  const fetchCompanyInfo = async () => {
    if (!userRole?.company_id) return;
    
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('state_id, name')
        .eq('id', userRole.company_id)
        .single();

      if (error) throw error;
      setCompanyInfo(data);
    } catch (error) {
      console.error('Error fetching company info:', error);
    }
  };

  // Get initial map center based on company location
  const getInitialMapCenter = () => {
    if (companyInfo?.state_id) {
      console.log('🗺️ Setting map center for company state:', companyInfo.state_id);
      return getStateCoordinates(companyInfo.state_id);
    }
    console.log('🗺️ Using default US center');
    return { lat: 39.8283, lng: -98.5795 }; // Default US center
  };

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
          vehicle_positions!inner (
            latitude,
            longitude,
            speed,
            bearing,
            odometer,
            date_time
          )
        `)
        .gte('vehicle_positions.date_time', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour only
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
            time: latestPosition.date_time,
            speed: latestPosition.speed,
            odometer: latestPosition.odometer
          } : null,
          allPositionTimes: vehicle.vehicle_positions?.map(p => p.date_time).slice(0, 3) // Show first 3 timestamps
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
      setSyncStatus(`${t('fleet:sync.syncing')} ${action}...`);
      toast({
        title: t('fleet:sync.syncing'),
        description: `${t('fleet:sync.sync_started')} ${action}`
      });
      
      // Extended timeout for position sync which is slower
      const timeoutMs = action === 'sync-positions' ? 120000 : 30000; // 2 minutes for positions, 30s for others
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${t('fleet:sync.sync_timeout')} ${timeoutMs/1000} ${t('fleet:sync.seconds')}`)), timeoutMs)
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
        title: `✅ ${t('fleet:sync.sync_success')}`,
        description: data?.message || `${action} ${t('fleet:sync.sync_completed')}`
      });
      
      await loadVehicles();
    } catch (error) {
      console.error('Error syncing Geotab data:', error);
      setSyncStatus('');
      
      toast({
        title: `❌ ${t('fleet:sync.sync_error')}`,
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Initialize Google Maps with company-based center
  useEffect(() => {
    if (!mapContainer.current || !googleApiKey) return;

    const mapCenter = getInitialMapCenter();
    const zoom = companyInfo?.state_id ? 6 : 4; // State level zoom vs national zoom

    const loader = new Loader({
      apiKey: googleApiKey,
      version: "weekly",
      libraries: ["places"]
    });

    loader.load().then(() => {
      if (mapContainer.current) {
        map.current = new google.maps.Map(mapContainer.current, {
          center: mapCenter,
          zoom: zoom,
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
  }, [googleApiKey, companyInfo]);

  // Fetch company info when component mounts or userRole changes
  useEffect(() => {
    fetchCompanyInfo();
  }, [userRole]);

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
              <p style="margin: 4px 0; font-size: 14px;">${t('fleet:vehicle.speed')}: ${convertToMph(vehicle.speed)} mph</p>
              <p style="margin: 4px 0; font-size: 14px;">${t('fleet:vehicle.odometer')}: ${vehicle.odometer || 0} km</p>
              <p style="margin: 4px 0; font-size: 12px; color: #666;">
                ${vehicle.last_update ? new Date(vehicle.last_update).toLocaleString() : t('fleet:vehicle.no_data')}
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

  // Real-time position updates - only connect if we have vehicles to track
  useEffect(() => {
    // Only establish realtime connection if we have vehicles and Google Maps is loaded
    if (vehicles.length === 0 || !googleApiKey || !window.google) {
      return;
    }

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
  }, [vehicles.length, googleApiKey]);

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
          <CardTitle>🗺️ {t('fleet:google_maps.api_setup')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('fleet:google_maps.instructions')}
            </p>
            <div className="space-y-2">
              <input
                type="text"
                placeholder={t('fleet:google_maps.enter_key')}
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
                {t('fleet:google_maps.setup_button')}
              </Button>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-medium">📋 {t('fleet:google_maps.steps_title')}</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>{t('fleet:google_maps.step1')}</li>
                <li>{t('fleet:google_maps.step2')}</li>
                <li>{t('fleet:google_maps.step3')}</li>
                <li>{t('fleet:google_maps.step4')}</li>
                <li>{t('fleet:google_maps.step5')}</li>
              </ol>
              <a 
                href="https://console.cloud.google.com/google/maps-apis/overview" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block text-blue-600 hover:underline"
              >
                → {t('fleet:google_maps.get_key')}
              </a>
            </div>
            <div className="bg-blue-50 p-3 rounded text-sm">
              <p className="font-medium text-blue-800">💰 {t('fleet:google_maps.free_limit')}</p>
              <p className="text-blue-700">{t('fleet:google_maps.monthly_limit')}</p>
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
            🗺️ {t('fleet:titles.command_map')}
            <Badge variant="outline" className="bg-fleet-green/10 text-fleet-green border-fleet-green/20 animate-pulse">
              {t('fleet:states.live')}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncGeotabData('sync-vehicles')}
              disabled={!!syncStatus}
            >
              🚛 {t('fleet:sync.sync_vehicles')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncGeotabData('sync-positions')}
              disabled={!!syncStatus}
            >
              📍 {t('fleet:sync.sync_positions')}
            </Button>
          </div>
        </CardTitle>
        {syncStatus && (
          <p className="text-sm text-muted-foreground">{syncStatus}</p>
        )}
      </CardHeader>
      <CardContent>
        {/* Google Maps */}
        <div className="relative h-[600px] rounded-lg border overflow-hidden mb-4">
          <div ref={mapContainer} className="w-full h-full" />
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">{t('fleet:states.loading_vehicles')}</p>
            </div>
          )}
        </div>

        {/* Vehicle List */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground mb-3">
            {t('fleet:states.active_vehicles')} ({vehicles.length})
          </h4>
          {vehicles.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <p>{t('fleet:states.no_vehicles')}</p>
              <p className="text-xs">{t('fleet:states.sync_instruction')}</p>
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
                        : t('fleet:vehicle.no_location')
                      }
                    </span>
                  </div>
                  <Badge variant={getStatusColor(vehicle.status) as any} className="text-xs">
                    {getStatusText(vehicle.status, t)}
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