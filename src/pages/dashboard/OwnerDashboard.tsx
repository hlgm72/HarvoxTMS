import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { CommandMap } from "@/components/dashboard/CommandMap";
import { DispatchPanel } from "@/components/dashboard/DispatchPanel";
import { FleetStatus } from "@/components/dashboard/FleetStatus";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Users, DollarSign, AlertTriangle } from "lucide-react";

export default function OwnerDashboard() {
  const { t } = useTranslation(['common', 'fleet']);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-fleet bg-clip-text text-transparent mb-2">
            Dashboard Ejecutivo
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 bg-fleet-green rounded-full animate-pulse"></span>
            Vista panorámica de la empresa • {new Date().toLocaleDateString('es-ES')}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>🕐 {new Date().toLocaleTimeString('es-ES')}</span>
        </div>
      </div>

      {/* Executive KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Ingresos del Mes"
          value="$147,890"
          icon="💰"
          trend={{ value: 12.5, isPositive: true }}
          variant="success"
        />
        <StatsCard
          title="Cargas Completadas"
          value="156"
          icon="✅"
          trend={{ value: 8.3, isPositive: true }}
          variant="success"
        />
        <StatsCard
          title="Eficiencia de Flota"
          value="89.2%"
          icon="📊"
          trend={{ value: 3.1, isPositive: true }}
          variant="success"
        />
        <StatsCard
          title="Conductores Activos"
          value="24"
          icon="👥"
          trend={{ value: 2, isPositive: true }}
          variant="warning"
        />
      </div>

      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Rendimiento Financiero
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Ingresos YTD</span>
                <span className="font-semibold text-green-600">$1,247,890</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Gastos YTD</span>
                <span className="font-semibold">$892,340</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Utilidad Neta</span>
                <span className="font-bold text-green-600">$355,550</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Gestión de Personal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Empleados</span>
                <span className="font-semibold">28</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Conductores</span>
                <span className="font-semibold">24</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Dispatchers</span>
                <span className="font-semibold">4</span>
              </div>
              <Button className="w-full mt-4" variant="outline" size="sm">
                Gestionar Personal
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Alertas Ejecutivas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm font-medium text-orange-800">3 Licencias CDL vencen pronto</p>
                <p className="text-xs text-orange-600">Requiere atención inmediata</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-800">Nueva oportunidad de contrato</p>
                <p className="text-xs text-blue-600">Revisar propuesta</p>
              </div>
              <Button className="w-full" variant="outline" size="sm">
                Ver Todas las Alertas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operations Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <CommandMap />
        </div>
        <div>
          <FleetStatus />
        </div>
      </div>

      {/* Detailed Reports */}
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