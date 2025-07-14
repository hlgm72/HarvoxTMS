import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Truck, 
  Navigation, 
  Clock, 
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGeotabVehicles } from "@/hooks/useGeotabVehicles";

export function EquipmentLocationMap() {
  const { t } = useTranslation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  
  const { equipmentWithGeotab, isLoadingEquipmentWithGeotab } = useGeotabVehicles();

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      if (!mapContainer.current || map.current) return;

      try {
        // You would need to configure the Google Maps API key in your Supabase secrets
        // For now, we'll show a placeholder message
        const { Loader } = await import("@googlemaps/js-api-loader");
        
        const loader = new Loader({
          apiKey: "YOUR_GOOGLE_MAPS_API_KEY", // This should come from Supabase secrets
          version: "weekly",
          libraries: ["places"]
        });

        const google = await loader.load();
        
        map.current = new google.maps.Map(mapContainer.current, {
          center: { lat: 39.8283, lng: -98.5795 }, // Center of USA
          zoom: 5,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
        });

        setIsMapLoaded(true);
      } catch (error) {
        console.error("Error loading Google Maps:", error);
      }
    };

    initMap();
  }, []);

  // Add markers for equipment with locations
  useEffect(() => {
    if (!map.current || !isMapLoaded || !equipmentWithGeotab) return;

    // Clear existing markers
    const markers: google.maps.Marker[] = [];
    
    equipmentWithGeotab.forEach((equipment) => {
      const geotabVehicle = equipment.geotab_vehicle;
      const position = geotabVehicle?.latest_position;
      
      if (position && window.google) {
        const marker = new window.google.maps.Marker({
          position: { 
            lat: position.latitude, 
            lng: position.longitude 
          },
          map: map.current,
          title: equipment.equipment_number,
          icon: {
            url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
                <path d="M15 18H9"/>
                <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
                <circle cx="17" cy="18" r="2"/>
                <circle cx="7" cy="18" r="2"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(32, 32),
          }
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold;">${equipment.equipment_number}</h3>
              <p style="margin: 4px 0;"><strong>Tipo:</strong> ${equipment.equipment_type}</p>
              <p style="margin: 4px 0;"><strong>Marca:</strong> ${equipment.make || 'N/A'}</p>
              <p style="margin: 4px 0;"><strong>Modelo:</strong> ${equipment.model || 'N/A'}</p>
              <p style="margin: 4px 0;"><strong>Velocidad:</strong> ${Math.round(position.speed || 0)} km/h</p>
              <p style="margin: 4px 0;"><strong>Última actualización:</strong> ${new Date(position.date_time).toLocaleString()}</p>
            </div>
          `
        });

        marker.addListener("click", () => {
          infoWindow.open(map.current, marker);
          setSelectedEquipment(equipment);
        });

        markers.push(marker);
      }
    });

    // Cleanup function to remove markers
    return () => {
      markers.forEach(marker => {
        marker.setMap(null);
      });
    };
  }, [equipmentWithGeotab, isMapLoaded]);

  const equipmentWithLocation = equipmentWithGeotab?.filter(eq => 
    eq.geotab_vehicle?.latest_position
  ) || [];

  const equipmentWithoutLocation = equipmentWithGeotab?.filter(eq => 
    !eq.geotab_vehicle?.latest_position
  ) || [];

  return (
    <div className="space-y-6">
      {/* Map Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t("equipment.location.map.title", "Mapa de Equipos")}
            <Badge variant="secondary" className="ml-auto">
              {equipmentWithLocation.length} con ubicación
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Placeholder for Google Maps - requires API key configuration */}
          <div 
            ref={mapContainer}
            className="w-full h-96 bg-muted rounded-lg flex items-center justify-center"
          >
            {!isMapLoaded && (
              <div className="text-center text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">
                  {t("equipment.location.map.placeholder", "Mapa de Ubicaciones")}
                </p>
                <p className="text-sm">
                  {t("equipment.location.map.setup", "Configure la API de Google Maps para ver las ubicaciones en tiempo real")}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Equipment Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equipment with Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-green-600" />
              {t("equipment.location.withLocation", "Con Ubicación")}
              <Badge variant="default" className="ml-auto">
                {equipmentWithLocation.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {equipmentWithLocation.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t("equipment.location.noLocationData", "No hay equipos con datos de ubicación")}</p>
              </div>
            ) : (
              equipmentWithLocation.map((equipment) => {
                const position = equipment.geotab_vehicle?.latest_position;
                const lastUpdate = position ? new Date(position.date_time) : null;
                const hoursAgo = lastUpdate ? 
                  Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60)) : null;

                return (
                  <div 
                    key={equipment.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedEquipment?.id === equipment.id ? 'bg-muted border-primary' : ''
                    }`}
                    onClick={() => setSelectedEquipment(equipment)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        <span className="font-medium">{equipment.equipment_number}</span>
                      </div>
                      <Badge variant={hoursAgo && hoursAgo < 1 ? "default" : "secondary"}>
                        {hoursAgo === 0 ? "Ahora" : `${hoursAgo}h`}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>{equipment.geotab_vehicle?.name}</p>
                      {position && (
                        <p className="flex items-center gap-1">
                          <Navigation className="h-3 w-3" />
                          {Math.round(position.speed || 0)} km/h
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Equipment without Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              {t("equipment.location.withoutLocation", "Sin Ubicación")}
              <Badge variant="outline" className="ml-auto">
                {equipmentWithoutLocation.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {equipmentWithoutLocation.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t("equipment.location.allTracked", "Todos los equipos están siendo rastreados")}</p>
              </div>
            ) : (
              equipmentWithoutLocation.map((equipment) => (
                <div 
                  key={equipment.id}
                  className="p-3 border rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      <span className="font-medium">{equipment.equipment_number}</span>
                    </div>
                    <Badge variant="outline">
                      {equipment.geotab_vehicle_id ? "Sin datos" : "No vinculado"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>{equipment.make} {equipment.model}</p>
                    <p className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {equipment.geotab_vehicle_id 
                        ? "Esperando datos de ubicación" 
                        : "Requiere vinculación con Geotab"
                      }
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}