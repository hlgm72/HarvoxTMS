import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, AlertTriangle, DollarSign, Clock, User, Settings } from "lucide-react";

export function DeductionsManager() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestión de Deducciones</h2>
          <p className="text-muted-foreground">Administra gastos recurrentes y deducciones de conductores</p>
        </div>
        <Button disabled>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Deducción
          <Badge variant="secondary" className="ml-2">Próximamente</Badge>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sistema de Deducciones</CardTitle>
          <CardDescription>
            El sistema de gestión de deducciones permite automatizar gastos recurrentes para conductores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-start gap-3">
              <Settings className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold">Plantillas Recurrentes</h4>
                <p className="text-sm text-muted-foreground">
                  Configura gastos que se aplican automáticamente según frecuencia (semanal, quincenal, mensual)
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold">Procesamiento Automático</h4>
                <p className="text-sm text-muted-foreground">
                  Los gastos se generan automáticamente cuando se procesan los períodos de pago
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold">Gestión de Prioridades</h4>
                <p className="text-sm text-muted-foreground">
                  Gastos críticos siempre se aplican, mientras que los normales se diferieren si no hay balance suficiente
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">¿Cómo funciona?</h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Crea plantillas de deducciones para cada conductor</li>
              <li>2. Define la frecuencia y monto de cada deducción</li>
              <li>3. El sistema genera automáticamente las instancias al procesar períodos</li>
              <li>4. Las deducciones se aplican según prioridad y balance disponible</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}