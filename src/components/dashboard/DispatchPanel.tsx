import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DispatchPanel() {
  console.log('📋 DispatchPanel rendering with simplified implementation');
  
  return (
    <Card className="h-[400px]">
      <CardHeader>
        <CardTitle>Panel de Despacho</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="border rounded-lg p-3">
            <div className="font-medium">Carga #1001</div>
            <div className="text-sm text-muted-foreground">Austin, TX → Dallas, TX</div>
            <div className="text-xs text-blue-600">En tránsito</div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="font-medium">Carga #1002</div>
            <div className="text-sm text-muted-foreground">Houston, TX → San Antonio, TX</div>
            <div className="text-xs text-yellow-600">Cargando</div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="font-medium">Carga #1003</div>
            <div className="text-sm text-muted-foreground">Fort Worth, TX → El Paso, TX</div>
            <div className="text-xs text-green-600">Entregado</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}