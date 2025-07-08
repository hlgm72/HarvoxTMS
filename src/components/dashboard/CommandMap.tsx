import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const activeVehicles = [
  { id: "TR-001", driver: "Carlos Rodriguez", location: "I-95 North, Mile 245", status: "en_route", cargo: "Walmart DC", eta: "2h 15m" },
  { id: "TR-007", driver: "Maria Garcia", location: "I-10 West, Mile 180", status: "loading", cargo: "Home Depot", eta: "4h 30m" },
  { id: "TR-012", driver: "Jose Martinez", location: "I-75 South, Mile 95", status: "delivered", cargo: "Target Store", eta: "Completado" },
  { id: "TR-018", driver: "Ana Lopez", location: "US-40 East, Mile 67", status: "maintenance", cargo: "N/A", eta: "En taller" },
];

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
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          🗺️ Mapa de Comando en Tiempo Real
          <Badge variant="outline" className="bg-fleet-green/10 text-fleet-green border-fleet-green/20 animate-pulse">
            LIVE
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Map Placeholder */}
        <div className="relative h-64 bg-gradient-subtle rounded-lg border overflow-hidden mb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-fleet-sky/10 to-fleet-blue/10">
            <div className="absolute top-4 left-4 text-sm text-muted-foreground">
              📍 Vista del Territorio Nacional
            </div>
            
            {/* Simulated Vehicle Markers */}
            <div className="absolute top-16 left-20 w-3 h-3 bg-fleet-green rounded-full animate-pulse shadow-glow"></div>
            <div className="absolute top-32 right-24 w-3 h-3 bg-warning rounded-full animate-pulse"></div>
            <div className="absolute bottom-20 left-32 w-3 h-3 bg-fleet-blue rounded-full animate-pulse"></div>
            <div className="absolute bottom-16 right-16 w-3 h-3 bg-destructive rounded-full animate-pulse"></div>
            
            <div className="absolute bottom-4 right-4 text-xs text-muted-foreground">
              🛰️ Actualización cada 30 segundos
            </div>
          </div>
        </div>

        {/* Vehicle List */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground mb-3">Vehículos Activos</h4>
          {activeVehicles.map((vehicle) => (
            <div key={vehicle.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{vehicle.id}</span>
                  <span className="text-xs text-muted-foreground">{vehicle.driver}</span>
                </div>
                <Badge variant={getStatusColor(vehicle.status) as any} className="text-xs">
                  {getStatusText(vehicle.status)}
                </Badge>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium">{vehicle.eta}</div>
                <div className="text-xs text-muted-foreground truncate max-w-24">{vehicle.cargo}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}