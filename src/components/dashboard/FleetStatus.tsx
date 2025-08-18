import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function FleetStatus() {
  // FleetStatus rendering with simplified implementation
  
  return (
    <Card className="h-[400px]">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Estado de la Flota</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600">18</div>
            <div className="text-sm text-muted-foreground">Activos</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">3</div>
            <div className="text-sm text-muted-foreground">Mantenimiento</div>
          </div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">5</div>
            <div className="text-sm text-muted-foreground">Disponibles</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">26</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
        </div>
        
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Utilización: 85.7%</span>
            <Badge variant="secondary" className="text-xs">Normal</Badge>
          </div>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Alertas Recientes</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-2 bg-green-50 dark:bg-green-950/20 rounded-md text-sm">
              <span className="text-green-600">✅</span>
              <span>Todos los sistemas operativos</span>
            </div>
            <div className="flex items-center gap-3 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-md text-sm">
              <span className="text-blue-600">ℹ️</span>
              <span>Sincronización completada</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}