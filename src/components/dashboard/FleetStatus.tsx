import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const fleetData = {
  active: 24,
  maintenance: 3,
  available: 8,
  total: 35,
  utilization: 85.7
};

const statusBreakdown = [
  { status: "En Ruta", count: 18, color: "bg-fleet-green", percentage: 51.4 },
  { status: "Cargando", count: 6, color: "bg-warning", percentage: 17.1 },
  { status: "Disponible", count: 8, color: "bg-fleet-blue", percentage: 22.9 },
  { status: "Mantenimiento", count: 3, color: "bg-destructive", percentage: 8.6 }
];

const alerts = [
  { type: "warning", message: "TR-003: Mantenimiento programado mañana" },
  { type: "info", message: "TR-015: Licencia CDL vence en 15 días" },
  { type: "success", message: "TR-022: Inspección DOT completada" }
];

const getAlertIcon = (type: string) => {
  switch (type) {
    case "warning": return "⚠️";
    case "info": return "ℹ️";
    case "success": return "✅";
    default: return "📢";
  }
};

export function FleetStatus() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          🚛 Estado de Flota
          <Badge variant="outline" className="bg-fleet-green/10 text-fleet-green border-fleet-green/20">
            {fleetData.utilization}% Activa
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-gradient-subtle rounded-lg">
            <div className="text-2xl font-bold text-fleet-blue">{fleetData.active}</div>
            <div className="text-xs text-muted-foreground">Activos</div>
          </div>
          <div className="text-center p-3 bg-gradient-subtle rounded-lg">
            <div className="text-2xl font-bold text-fleet-green">{fleetData.available}</div>
            <div className="text-xs text-muted-foreground">Disponibles</div>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">Distribución por Estado</h4>
          {statusBreakdown.map((item) => (
            <div key={item.status} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                <span className="text-sm">{item.status}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{item.count}</span>
                <span className="text-xs text-muted-foreground">({item.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">Alertas Recientes</h4>
          <div className="space-y-1">
            {alerts.map((alert, index) => (
              <div key={index} className="flex items-start gap-2 p-2 rounded bg-muted/30 text-xs">
                <span>{getAlertIcon(alert.type)}</span>
                <span className="flex-1">{alert.message}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Utilization Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Utilización de Flota</span>
            <span className="font-medium">{fleetData.utilization}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-gradient-fleet h-2 rounded-full transition-all duration-300" 
              style={{ width: `${fleetData.utilization}%` }}
            ></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}