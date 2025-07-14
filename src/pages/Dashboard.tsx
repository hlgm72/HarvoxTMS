import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { CommandMap } from "@/components/dashboard/CommandMap";
import { DispatchPanel } from "@/components/dashboard/DispatchPanel";
import { FleetStatus } from "@/components/dashboard/FleetStatus";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { PWAInstallBanner } from "@/components/ui/PWAInstallBanner";

export default function Dashboard() {
  
  return (
    <>
      <PageToolbar 
        breadcrumbs={[
          { label: "Centro de Comando" }
        ]}
      />
      <div className="p-3 md:p-6 space-y-4 md:space-y-6">
        {/* PWA Install Banner */}
        <PWAInstallBanner />

        {/* Stats Grid - Mejorado para móviles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <StatsCard
            title="Cargas en Tránsito"
            value={24}
            icon="🚛"
            trend={{ value: 12, isPositive: true }}
            variant="success"
          />
          <StatsCard
            title="Utilización de Flota"
            value="85.7%"
            icon="🚛"
            trend={{ value: 3.2, isPositive: true }}
            variant="success"
          />
          <StatsCard
            title="Ingresos de Hoy"
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

        {/* Command Grid - Stack en móviles */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          <div className="xl:col-span-2 order-2 lg:order-1">
            <CommandMap />
          </div>
          <div className="order-1 lg:order-2">
            <FleetStatus />
          </div>
        </div>

        {/* Operations Grid - Stack en móviles */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="order-2 lg:order-1">
            <DispatchPanel />
          </div>
          <div className="lg:col-span-2 order-1 lg:order-2">
            <RecentActivity />
          </div>
        </div>
      </div>
    </>
  );
}