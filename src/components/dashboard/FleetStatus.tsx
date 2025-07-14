import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function FleetStatus() {
  console.log('🚛 FleetStatus rendering with simplified implementation');
  
  return (
    <Card className="h-[400px]">
      <CardHeader>
        <CardTitle>Estado de la Flota</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">18</div>
            <div className="text-sm text-muted-foreground">Activos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">3</div>
            <div className="text-sm text-muted-foreground">Mantenimiento</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">5</div>
            <div className="text-sm text-muted-foreground">Disponibles</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">26</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Utilización: 85.7%</span>
            <Badge variant="secondary">Normal</Badge>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium">Alertas Recientes</h4>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <span>✅</span>
              <span>Todos los sistemas operativos</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>ℹ️</span>
              <span>Sincronización completada</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}