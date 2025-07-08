import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { CommandMap } from "@/components/dashboard/CommandMap";
import { DispatchPanel } from "@/components/dashboard/DispatchPanel";
import { FleetStatus } from "@/components/dashboard/FleetStatus";

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-fleet bg-clip-text text-transparent mb-2">
            Centro de Comando FleetNest
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 bg-fleet-green rounded-full animate-pulse"></span>
            Operaciones en tiempo real • Última actualización: hace 30 segundos
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>🕐 {new Date().toLocaleTimeString('es-ES')}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Cargas en Tránsito"
          value={24}
          icon="🚛"
          trend={{ value: 12, isPositive: true }}
          variant="success"
        />
        <StatsCard
          title="Flota Activa"
          value="85.7%"
          icon="🚛"
          trend={{ value: 3.2, isPositive: true }}
          variant="success"
        />
        <StatsCard
          title="Ingresos Hoy"
          value="$47,890"
          icon="💰"
          trend={{ value: 15.3, isPositive: true }}
          variant="success"
        />
        <StatsCard
          title="Entregas Programadas"
          value={38}
          icon="📦"
          trend={{ value: 8.7, isPositive: true }}
          variant="warning"
        />
      </div>

      {/* Command Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <CommandMap />
        </div>
        <div>
          <FleetStatus />
        </div>
      </div>

      {/* Operations Grid */}
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