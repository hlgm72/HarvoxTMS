import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { CommandMap } from "@/components/dashboard/CommandMap";
import { DispatchPanel } from "@/components/dashboard/DispatchPanel";
import { FleetStatus } from "@/components/dashboard/FleetStatus";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageSquare, MapPin, Clock } from "lucide-react";

export default function DispatcherDashboard() {
  const { t } = useTranslation(['common', 'fleet']);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-fleet bg-clip-text text-transparent mb-2">
            Panel de Despacho
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 bg-fleet-green rounded-full animate-pulse"></span>
            Operaciones en tiempo real • {new Date().toLocaleDateString('es-ES')}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>🕐 {new Date().toLocaleTimeString('es-ES')}</span>
        </div>
      </div>

      {/* Dispatch KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Mis Cargas Asignadas"
          value="12"
          icon="📦"
          trend={{ value: 3, isPositive: true }}
          variant="success"
        />
        <StatsCard
          title="Conductores Supervisados"
          value="8"
          icon="👤"
          trend={{ value: 1, isPositive: true }}
          variant="success"
        />
        <StatsCard
          title="Cargas Pendientes"
          value="4"
          icon="⏳"
          trend={{ value: 2, isPositive: false }}
          variant="warning"
        />
        <StatsCard
          title="Entregas Hoy"
          value="6"
          icon="✅"
          trend={{ value: 2, isPositive: true }}
          variant="success"
        />
      </div>

      {/* Quick Actions & Active Loads */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-green-600" />
              Comunicación Activa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full justify-start" variant="outline" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Mensajes (3 nuevos)
              </Button>
              <Button className="w-full justify-start" variant="outline" size="sm">
                <Phone className="h-4 w-4 mr-2" />
                Llamadas Pendientes
              </Button>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-800">Juan Pérez - Conductor</p>
                <p className="text-xs text-blue-600">Última comunicación: 15 min ago</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Cargas Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">#LD-001</p>
                  <p className="text-sm text-muted-foreground">Houston → Dallas</p>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  En ruta
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">#LD-002</p>
                  <p className="text-sm text-muted-foreground">Miami → Tampa</p>
                </div>
                <Badge variant="outline" className="bg-orange-50 text-orange-700">
                  Cargando
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">#LD-003</p>
                  <p className="text-sm text-muted-foreground">LA → Phoenix</p>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Asignada
                </Badge>
              </div>
              <Button className="w-full mt-4" variant="outline" size="sm">
                Ver Todas las Cargas
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" />
              Próximas Entregas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800">Dallas</p>
                <p className="text-xs text-green-600">Estimado: 2:30 PM</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm font-medium text-orange-800">Tampa</p>
                <p className="text-xs text-orange-600">Estimado: 4:15 PM</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-800">Phoenix</p>
                <p className="text-xs text-blue-600">Estimado: Mañana 9:00 AM</p>
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

      {/* Dispatch Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <DispatchPanel />
        </div>
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}