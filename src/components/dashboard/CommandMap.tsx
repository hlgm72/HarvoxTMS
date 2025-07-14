import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CommandMap() {
  console.log('🗺️ CommandMap rendering with simplified implementation');
  
  return (
    <Card className="h-[400px]">
      <CardHeader>
        <CardTitle>Mapa de Comando</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <div className="text-4xl mb-2">🗺️</div>
            <p>Vista del mapa en desarrollo</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}