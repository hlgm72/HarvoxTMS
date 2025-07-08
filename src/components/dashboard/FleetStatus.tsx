import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FleetData {
  active: number;
  maintenance: number;
  available: number;
  total: number;
  utilization: number;
}

const alerts = [
  { type: "warning", message: "Verificar conexión con dispositivos GPS" },
  { type: "info", message: "Sincronización de datos completada" },
  { type: "success", message: "Todos los sistemas operativos" }
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
  const [fleetData, setFleetData] = useState<FleetData>({
    active: 0,
    maintenance: 0,
    available: 0,
    total: 0,
    utilization: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadFleetData = async () => {
    try {
      setLoading(true);
      
      // Obtener total de vehículos
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, name');

      if (vehiclesError) {
        console.error('Error loading vehicles:', vehiclesError);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos de la flota",
          variant: "destructive"
        });
        return;
      }

      const totalVehicles = vehicles?.length || 0;
      
      // Por ahora, simulamos estados basados en el total de vehículos
      // En el futuro se puede implementar lógica más sofisticada basada en posiciones GPS, estado del motor, etc.
      const activeVehicles = Math.floor(totalVehicles * 0.7); // 70% activos
      const availableVehicles = Math.floor(totalVehicles * 0.2); // 20% disponibles
      const maintenanceVehicles = totalVehicles - activeVehicles - availableVehicles;
      const utilization = totalVehicles > 0 ? (activeVehicles / totalVehicles) * 100 : 0;

      setFleetData({
        active: activeVehicles,
        maintenance: maintenanceVehicles,
        available: availableVehicles,
        total: totalVehicles,
        utilization: Math.round(utilization * 10) / 10
      });

    } catch (error) {
      console.error('Error loading fleet data:', error);
      toast({
        title: "Error",
        description: "Error al cargar datos de la flota",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFleetData();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(loadFleetData, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusBreakdown = [
    { 
      status: "Activos", 
      count: fleetData.active, 
      color: "bg-fleet-green", 
      percentage: fleetData.total > 0 ? Math.round((fleetData.active / fleetData.total) * 100) : 0 
    },
    { 
      status: "Disponibles", 
      count: fleetData.available, 
      color: "bg-fleet-blue", 
      percentage: fleetData.total > 0 ? Math.round((fleetData.available / fleetData.total) * 100) : 0 
    },
    { 
      status: "Mantenimiento", 
      count: fleetData.maintenance, 
      color: "bg-destructive", 
      percentage: fleetData.total > 0 ? Math.round((fleetData.maintenance / fleetData.total) * 100) : 0 
    }
  ];

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle>🚛 Estado de Flota</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="h-16 bg-muted rounded-lg"></div>
              <div className="h-16 bg-muted rounded-lg"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-8 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

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
            <div className="text-2xl font-bold text-fleet-blue">{fleetData.total}</div>
            <div className="text-xs text-muted-foreground">Total Vehículos</div>
          </div>
          <div className="text-center p-3 bg-gradient-subtle rounded-lg">
            <div className="text-2xl font-bold text-fleet-green">{fleetData.active}</div>
            <div className="text-xs text-muted-foreground">Activos</div>
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
          <h4 className="font-medium text-sm text-muted-foreground">Estado del Sistema</h4>
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