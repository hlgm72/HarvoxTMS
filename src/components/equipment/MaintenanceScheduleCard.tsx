import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Wrench, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MaintenanceItem {
  id: string;
  equipmentNumber: string;
  maintenanceType: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  mileage?: number;
  overdue?: boolean;
}

interface MaintenanceScheduleCardProps {
  upcomingMaintenance: MaintenanceItem[];
  overdueCount: number;
  thisWeekCount: number;
}

export function MaintenanceScheduleCard({ 
  upcomingMaintenance, 
  overdueCount, 
  thisWeekCount 
}: MaintenanceScheduleCardProps) {
  const getPriorityBadge = (priority: string, overdue: boolean = false) => {
    if (overdue) {
      return <Badge variant="destructive" className="text-xs">Vencido</Badge>;
    }
    
    switch (priority) {
      case "high":
        return <Badge variant="destructive" className="text-xs">Alta</Badge>;
      case "medium":
        return <Badge variant="warning" className="text-xs">Media</Badge>;
      case "low":
        return <Badge variant="secondary" className="text-xs">Baja</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Normal</Badge>;
    }
  };

  const getPriorityIcon = (priority: string, overdue: boolean = false) => {
    if (overdue) {
      return <AlertCircle className="h-3 w-3 text-destructive" />;
    }
    
    switch (priority) {
      case "high":
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      case "medium":
        return <Calendar className="h-3 w-3 text-warning" />;
      case "low":
        return <Calendar className="h-3 w-3 text-muted-foreground" />;
      default:
        return <Calendar className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <Card className="h-[400px] bg-gradient-to-br from-background to-orange-50/30 dark:to-orange-950/20 border-orange-200/50 dark:border-orange-800/50 hover:shadow-elegant transition-all duration-300">
      <CardHeader className="pb-3 border-l-4 border-l-orange-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-orange-600" />
            <CardTitle className="text-base font-medium text-foreground">
              Maintenance Schedule
            </CardTitle>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">Upcoming & Overdue</div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-2 bg-destructive/10 rounded-lg">
            <div className="text-lg font-bold text-destructive">{overdueCount}</div>
            <div className="text-xs text-muted-foreground">Vencidos</div>
          </div>
          <div className="text-center p-2 bg-warning/10 rounded-lg">
            <div className="text-lg font-bold text-warning">{thisWeekCount}</div>
            <div className="text-xs text-muted-foreground">Esta Semana</div>
          </div>
        </div>
        
        {/* Alert summary */}
        {overdueCount > 0 && (
          <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-md">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <div className="flex-1">
              <div className="text-xs font-medium text-destructive">
                Mantenimientos Vencidos
              </div>
              <div className="text-xs text-muted-foreground">
                {overdueCount} equipos requieren atención inmediata
              </div>
            </div>
          </div>
        )}
        
        {/* Maintenance list */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-foreground mb-2">Próximos Mantenimientos</div>
          {upcomingMaintenance.slice(0, 4).map((item, index) => (
            <div key={item.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                {getPriorityIcon(item.priority, item.overdue)}
                <div>
                  <div className="text-xs font-medium">{item.equipmentNumber}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.maintenanceType}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {getPriorityBadge(item.priority, item.overdue)}
                <div className="text-xs text-muted-foreground">
                  {item.dueDate}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Quick action */}
        <div className="pt-2">
          <Button variant="outline" size="sm" className="w-full text-xs">
            <Calendar className="h-3 w-3 mr-2" />
            Ver Calendario Completo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}