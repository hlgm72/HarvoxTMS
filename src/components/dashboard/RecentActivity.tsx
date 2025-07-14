import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RecentActivity() {
  console.log('📊 RecentActivity rendering with simplified implementation');
  
  return (
    <Card className="h-[400px]">
      <CardHeader>
        <CardTitle>Actividad Reciente</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <div className="text-sm">
              <div className="font-medium">Entrega completada</div>
              <div className="text-muted-foreground">Carga #1003 - hace 2 horas</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <div className="text-sm">
              <div className="font-medium">Nueva carga asignada</div>
              <div className="text-muted-foreground">Carga #1004 - hace 3 horas</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <div className="text-sm">
              <div className="font-medium">Vehículo en mantenimiento</div>
              <div className="text-muted-foreground">TRK-001 - hace 4 horas</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <div className="text-sm">
              <div className="font-medium">Conductor conectado</div>
              <div className="text-muted-foreground">Juan Pérez - hace 5 horas</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}