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
import { useGeotabVehicles } from "@/hooks/useGeotabVehicles";
import { capitalizeWords } from '@/lib/textUtils';

export function EquipmentLocationMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  
  const { equipmentWithGeotab, isLoadingEquipmentWithGeotab } = useGeotabVehicles();

  // Cleanup function
  const cleanupMarkers = () => {
    markersRef.current.forEach(marker => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    markersRef.current = [];
  };

  // Initialize simplified map view (placeholder)
  useEffect(() => {
    const initMapPlaceholder = () => {
      if (!mapContainer.current) return;

      // For now, we'll use a simple placeholder instead of loading Google Maps
      // This avoids API key issues and potential React conflicts
      setIsMapLoaded(true);
    };

    initMapPlaceholder();

    // Cleanup on unmount
    return () => {
      cleanupMarkers();
      map.current = null;
      setIsMapLoaded(false);
    };
  }, []);

  const equipmentWithLocation = equipmentWithGeotab?.filter(eq => 
    eq.geotab_vehicle?.latest_position
  ) || [];

  const equipmentWithoutLocation = equipmentWithGeotab?.filter(eq => 
    !eq.geotab_vehicle?.latest_position
  ) || [];

  const refreshData = () => {
    // This would trigger a refresh of the equipment data
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Map Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mapa de Ubicaciones
            <Badge variant="secondary" className="ml-auto">
              {equipmentWithLocation.length} con ubicación
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshData}
              className="ml-2"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Simplified map placeholder */}
          <div 
            ref={mapContainer}
            className="w-full h-96 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/25"
          >
            <div className="text-center text-muted-foreground">
              <MapPin className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                Vista de Mapa Interactivo
              </h3>
              <p className="text-sm mb-4">
                La integración completa de Google Maps estará disponible próximamente
              </p>
              <div className="space-y-2">
                <p className="text-xs">
                  📍 {equipmentWithLocation.length} equipos con ubicación rastreada
                </p>
                <p className="text-xs">
                  🚚 {equipmentWithoutLocation.length} equipos sin ubicación
                </p>
              </div>
            </div>
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
              Equipos Con Ubicación
              <Badge variant="default" className="ml-auto">
                {equipmentWithLocation.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingEquipmentWithGeotab ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Cargando datos de ubicación...</p>
              </div>
            ) : equipmentWithLocation.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No hay equipos con datos de ubicación</p>
                <p className="text-xs mt-1">Sincroniza con Geotab para obtener ubicaciones</p>
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
                        <Truck className="h-4 w-4 text-primary" />
                        <span className="font-medium">{equipment.equipment_number}</span>
                      </div>
                      <Badge variant={hoursAgo !== null && hoursAgo < 1 ? "default" : "secondary"}>
                        {hoursAgo === 0 ? "Ahora" : hoursAgo !== null ? `${hoursAgo}h` : "N/A"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p className="flex items-center gap-1">
                        <span>🚛</span>
                        {equipment.geotab_vehicle?.name || capitalizeWords(equipment.make) + ' ' + capitalizeWords(equipment.model)}
                      </p>
                      {position && (
                        <>
                          <p className="flex items-center gap-1">
                            <Navigation className="h-3 w-3" />
                            Velocidad: {Math.round(position.speed || 0)} km/h
                          </p>
                          <p className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {position.latitude.toFixed(4)}, {position.longitude.toFixed(4)}
                          </p>
                          <p className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {lastUpdate?.toLocaleString()}
                          </p>
                        </>
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
              Equipos Sin Ubicación
              <Badge variant="outline" className="ml-auto">
                {equipmentWithoutLocation.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingEquipmentWithGeotab ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Verificando equipos...</p>
              </div>
            ) : equipmentWithoutLocation.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Truck className="h-8 w-8 mx-auto mb-2 opacity-50 text-green-600" />
                <p className="text-green-600 font-medium">¡Excelente!</p>
                <p>Todos los equipos están siendo rastreados</p>
              </div>
            ) : (
              equipmentWithoutLocation.map((equipment) => (
                <div 
                  key={equipment.id}
                  className="p-3 border rounded-lg border-amber-200 bg-amber-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-amber-600" />
                      <span className="font-medium">{equipment.equipment_number}</span>
                    </div>
                    <Badge variant="outline" className="text-amber-600 border-amber-600">
                      {equipment.geotab_vehicle_id ? "Sin datos" : "No vinculado"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>{capitalizeWords(equipment.make)} {capitalizeWords(equipment.model)}</p>
                    <p className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {equipment.geotab_vehicle_id 
                        ? "Esperando datos de Geotab" 
                        : "Requiere vinculación con Geotab"
                      }
                    </p>
                    {equipment.status && (
                      <p className="flex items-center gap-1">
                        <span>📋</span>
                        Estado: {equipment.status}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selected Equipment Details */}
      {selectedEquipment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Detalles del Equipo: {selectedEquipment.equipment_number}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Información General</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Tipo:</strong> {selectedEquipment.equipment_type}</p>
                  <p><strong>Marca:</strong> {selectedEquipment.make || 'N/A'}</p>
                  <p><strong>Modelo:</strong> {selectedEquipment.model || 'N/A'}</p>
                  <p><strong>Año:</strong> {selectedEquipment.year || 'N/A'}</p>
                </div>
              </div>
              
              {selectedEquipment.geotab_vehicle && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Datos Geotab</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Nombre:</strong> {selectedEquipment.geotab_vehicle.name}</p>
                    <p><strong>VIN:</strong> {selectedEquipment.geotab_vehicle.vin || 'N/A'}</p>
                    <p><strong>Placa:</strong> {selectedEquipment.geotab_vehicle.license_plate || 'N/A'}</p>
                  </div>
                </div>
              )}
              
              {selectedEquipment.geotab_vehicle?.latest_position && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Última Posición</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Velocidad:</strong> {Math.round(selectedEquipment.geotab_vehicle.latest_position.speed || 0)} km/h</p>
                    <p><strong>Coordenadas:</strong> {selectedEquipment.geotab_vehicle.latest_position.latitude.toFixed(4)}, {selectedEquipment.geotab_vehicle.latest_position.longitude.toFixed(4)}</p>
                    <p><strong>Última actualización:</strong> {new Date(selectedEquipment.geotab_vehicle.latest_position.date_time).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}