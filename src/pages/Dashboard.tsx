import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Panel de Control
        </h1>
        <p className="text-muted-foreground">
          Resumen de operaciones y estadísticas clave
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Cargas Activas"
          value={24}
          icon="🚛"
          trend={{ value: 12, isPositive: true }}
          variant="success"
        />
        <StatsCard
          title="Conductores Disponibles"
          value={18}
          icon="👨‍✈️"
          trend={{ value: 5, isPositive: false }}
          variant="warning"
        />
        <StatsCard
          title="Ingresos del Mes"
          value="$245,670"
          icon="💰"
          trend={{ value: 8, isPositive: true }}
          variant="success"
        />
        <StatsCard
          title="Entregas Completadas"
          value={156}
          icon="✅"
          trend={{ value: 15, isPositive: true }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
        
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-gradient-primary rounded-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">Acciones Rápidas</h3>
            <div className="space-y-3">
              <button className="w-full bg-white/20 hover:bg-white/30 rounded-lg p-3 text-left transition-colors">
                <div className="font-medium">Nueva Carga</div>
                <div className="text-sm opacity-90">Registrar nueva carga</div>
              </button>
              <button className="w-full bg-white/20 hover:bg-white/30 rounded-lg p-3 text-left transition-colors">
                <div className="font-medium">Asignar Conductor</div>
                <div className="text-sm opacity-90">Asignar carga a conductor</div>
              </button>
              <button className="w-full bg-white/20 hover:bg-white/30 rounded-lg p-3 text-left transition-colors">
                <div className="font-medium">Generar Reporte</div>
                <div className="text-sm opacity-90">Ver reportes detallados</div>
              </button>
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
            <h3 className="font-semibold text-warning mb-2">⚠️ Alertas</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-warning rounded-full"></span>
                3 conductores con licencias por vencer
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-destructive rounded-full"></span>
                Truck #TR-001 requiere mantenimiento
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-warning rounded-full"></span>
                5 facturas pendientes de cobro
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}