import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { CommandMap } from "@/components/dashboard/CommandMap";
import { DispatchPanel } from "@/components/dashboard/DispatchPanel";
import { FleetStatus } from "@/components/dashboard/FleetStatus";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Truck, MapPin, Clock } from "lucide-react";

export default function OperationsManagerDashboard() {
  const { t } = useTranslation(['common', 'fleet']);
  
  return (
    <>
      <PageToolbar 
        title="Dashboard Operacional"
      />
      <div className="p-6 space-y-6">

      {/* Operational KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Cargas en Tránsito"
          value="24"
          icon="🚛"
          trend={{ value: 12, isPositive: true }}
          variant="success"
        />
        <StatsCard
          title="Conductores Disponibles"
          value="18"
          icon="👤"
          trend={{ value: 2, isPositive: true }}
          variant="success"
        />
        <StatsCard
          title="Tiempo Promedio Entrega"
          value="4.2h"
          icon="⏱️"
          trend={{ value: 15, isPositive: false }}
          variant="warning"
        />
        <StatsCard
          title="Utilización de Flota"
          value="85.7%"
          icon="📊"
          trend={{ value: 3.2, isPositive: true }}
          variant="success"
        />
      </div>

      {/* Team Management Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Equipo de Dispatch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Carlos Martinez</p>
                  <p className="text-sm text-muted-foreground">Dispatcher Senior</p>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Activo
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Ana Rodriguez</p>
                  <p className="text-sm text-muted-foreground">Dispatcher</p>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Activo
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Luis Gonzalez</p>
                  <p className="text-sm text-muted-foreground">Dispatcher</p>
                </div>
                <Badge variant="outline" className="bg-orange-50 text-orange-700">
                  Break
                </Badge>
              </div>
              <Button className="w-full mt-4" variant="outline" size="sm">
                Gestionar Equipo
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-green-600" />
              Estado de Flota
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">En Ruta</span>
                <span className="font-semibold text-green-600">24</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Disponibles</span>
                <span className="font-semibold">18</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Mantenimiento</span>
                <span className="font-semibold text-orange-600">3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Fuera de Servicio</span>
                <span className="font-semibold text-red-600">1</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-purple-600" />
              Rutas Críticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm font-medium text-red-800">Houston → Dallas</p>
                <p className="text-xs text-red-600">Retraso estimado: 2 horas</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm font-medium text-orange-800">Miami → Orlando</p>
                <p className="text-xs text-orange-600">Tráfico pesado</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800">LA → Las Vegas</p>
                <p className="text-xs text-green-600">A tiempo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Operations View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <CommandMap />
        </div>
        <div>
          <FleetStatus />
        </div>
      </div>

      {/* Operations Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <DispatchPanel />
        </div>
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
      </div>
      </div>
    </>
  );
}