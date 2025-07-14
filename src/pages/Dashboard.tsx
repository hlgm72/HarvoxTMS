import { StatsCard } from "@/components/dashboard/StatsCard";
import { ActiveLoadsCard } from "@/components/dashboard/ActiveLoadsCard";
import { DriverMobileCard } from "@/components/dashboard/DriverMobileCard";
import { ReversMobileCard } from "@/components/dashboard/ReversMobileCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { CommandMap } from "@/components/dashboard/CommandMap";
import { DispatchPanel } from "@/components/dashboard/DispatchPanel";
import { FleetStatus } from "@/components/dashboard/FleetStatus";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { PWAInstallBanner } from "@/components/ui/PWAInstallBanner";

export default function Dashboard() {
  // Mock data para las nuevas cards
  const mockLoads = [
    { id: "1", driverName: "Me alvari-2...n", vehicleNumber: "Volrus", status: "on-time" as const, statusText: "En Ruta" },
    { id: "2", driverName: "Carlos Rodriguez", vehicleNumber: "FL-001", status: "delayed" as const, statusText: "Retrasado" },
    { id: "3", driverName: "Ana Martinez", vehicleNumber: "TX-205", status: "delivered" as const, statusText: "Entregado" },
  ];

  const mockVehicles = [
    { id: "1", driverName: "Madner", vehicleType: "Madner", vehicleImage: "", mileage: "0.16/VA1FT", rate: "269.46", status: "active" as const },
    { id: "2", driverName: "Milomery", vehicleType: "Milomery", vehicleImage: "", mileage: "0.24/VA1OE", rate: "412.62", status: "active" as const },
    { id: "3", driverName: "Evobule", vehicleType: "Evobule", vehicleImage: "", mileage: "0.10/VA1OE", rate: "204.35", status: "maintenance" as const },
  ];

  const mockReversItems = [
    { id: "1", name: "Feriat", description: "Yerri's Lbr Evendvs", icon: "▶️", iconColor: "#ff6b35", action: "❌" },
    { id: "2", name: "Deuel Trunius", description: "Yend of Brididng", icon: "💻", iconColor: "#4f46e5" },
    { id: "3", name: "Stovers", description: "irena D'uammistar", icon: "🔻", iconColor: "#dc2626" },
    { id: "4", name: "Malagrim", description: "Yemiy Ehaive fluseviana", icon: "☰", iconColor: "#6b7280" },
  ];

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

        {/* Advanced Cards Grid - Estilo de la imagen */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <ActiveLoadsCard
            totalLoads={24}
            trendValue={12}
            isPositive={true}
            loads={mockLoads}
          />
          <DriverMobileCard
            totalDrivers={8}
            vehicles={mockVehicles}
          />
          <ReversMobileCard
            items={mockReversItems}
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