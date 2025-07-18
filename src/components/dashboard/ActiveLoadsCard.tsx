import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoadItem {
  id: string;
  driverName: string;
  vehicleNumber: string;
  status: "on-time" | "delayed" | "delivered";
  statusText: string;
}

interface ActiveLoadsCardProps {
  totalLoads: number;
  trendValue: number;
  isPositive: boolean;
  loads: LoadItem[];
}

export function ActiveLoadsCard({ 
  totalLoads, 
  trendValue, 
  isPositive, 
  loads 
}: ActiveLoadsCardProps) {
  return (
    <Card className="h-[360px] bg-gradient-to-br from-background to-muted/20 border-primary/20 hover:shadow-elegant transition-all duration-300">
      <CardHeader className="pb-2 border-l-4 border-l-primary">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium text-foreground">
              Active Loads
            </CardTitle>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">Dashboard</div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Main stat display */}
        <div className="flex items-center gap-3">
          <div className="text-3xl font-heading font-bold text-foreground">{totalLoads}</div>
          <Badge 
            variant={isPositive ? "default" : "destructive"}
            className="text-xs px-2 py-1"
          >
            {isPositive ? "↗" : "↘"} UP
          </Badge>
        </div>
        
        {/* Progress indicator */}
        <div className="text-xs text-muted-foreground">
          {isPositive ? "+" : ""}{trendValue}% vs último período
        </div>
        
        {/* Load items - solo mostrar 2 para que quepa mejor */}
        <div className="space-y-2">
          {loads.slice(0, 2).map((load, index) => (
            <div key={load.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-medium text-primary">
                    {load.driverName.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-medium truncate max-w-[100px]">{load.driverName}</div>
                  <div className="text-xs text-muted-foreground">{load.vehicleNumber}</div>
                </div>
              </div>
              <Badge 
                variant={load.status === "on-time" ? "default" : 
                        load.status === "delayed" ? "destructive" : "secondary"}
                className="text-xs"
              >
                {load.statusText}
              </Badge>
            </div>
          ))}
        </div>
        
        {/* Status indicators - más compacto */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-success"></div>
            <span className="text-muted-foreground truncate">En tiempo</span>
            <span className="text-primary ml-auto">85%</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-warning"></div>
            <span className="text-muted-foreground truncate">Retrasado</span>
            <span className="text-destructive ml-auto">15%</span>
          </div>
        </div>
        
        {/* Bottom action - más compacto */}
        <div className="flex items-center gap-2 p-2 bg-warning/10 rounded-md">
          <div className="w-6 h-6 rounded-full bg-warning/20 flex items-center justify-center">
            <span className="text-warning text-xs">🔥</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">Urgente</div>
            <div className="text-xs text-muted-foreground">Revisar</div>
          </div>
          <Badge variant="secondary" className="text-xs">Ver</Badge>
        </div>
      </CardContent>
    </Card>
  );
}