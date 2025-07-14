import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Truck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EquipmentItem {
  id: string;
  equipmentNumber: string;
  make: string;
  model: string;
  status: "active" | "maintenance" | "inactive";
  mileage?: number;
  nextMaintenance?: string;
}

interface EquipmentOverviewCardProps {
  totalEquipment: number;
  activeCount: number;
  maintenanceCount: number;
  equipment: EquipmentItem[];
}

export function EquipmentOverviewCard({ 
  totalEquipment, 
  activeCount, 
  maintenanceCount, 
  equipment 
}: EquipmentOverviewCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="text-xs">Activo</Badge>;
      case "maintenance":
        return <Badge variant="warning" className="text-xs">Mantenimiento</Badge>;
      case "inactive":
        return <Badge variant="secondary" className="text-xs">Inactivo</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Desconocido</Badge>;
    }
  };

  return (
    <Card className="h-[400px] bg-gradient-to-br from-background to-green-50/30 dark:to-green-950/20 border-green-200/50 dark:border-green-800/50 hover:shadow-elegant transition-all duration-300">
      <CardHeader className="pb-3 border-l-4 border-l-green-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-green-600" />
            <CardTitle className="text-base font-medium text-foreground">
              Fleet Overview
            </CardTitle>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">Equipment Dashboard</div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{totalEquipment}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
            <div className="text-xs text-muted-foreground">Activos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-warning">{maintenanceCount}</div>
            <div className="text-xs text-muted-foreground">Mantenimiento</div>
          </div>
        </div>
        
        {/* Equipment list */}
        <div className="space-y-2 pt-2">
          {equipment.slice(0, 4).map((item, index) => (
            <div key={item.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Truck className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <div className="text-xs font-medium">{item.equipmentNumber}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.make} {item.model}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(item.status)}
                {item.status === "maintenance" && (
                  <AlertTriangle className="h-3 w-3 text-warning" />
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Maintenance alerts */}
        {maintenanceCount > 0 && (
          <div className="pt-2">
            <div className="flex items-center gap-2 p-2 bg-warning/10 rounded-md">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <div className="flex-1">
                <div className="text-xs font-medium">Próximos Mantenimientos</div>
                <div className="text-xs text-muted-foreground">
                  {maintenanceCount} equipos requieren atención
                </div>
              </div>
              <Badge variant="warning" className="text-xs">
                {maintenanceCount}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}