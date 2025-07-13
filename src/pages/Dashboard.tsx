import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { CommandMap } from "@/components/dashboard/CommandMap";
import { DispatchPanel } from "@/components/dashboard/DispatchPanel";
import { FleetStatus } from "@/components/dashboard/FleetStatus";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { PWAInstallBanner } from "@/components/ui/PWAInstallBanner";
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
  const { t } = useTranslation(['common', 'fleet']);
  
  return (
    <>
      <PageToolbar 
        breadcrumbs={[
          { label: "Centro de Comando" }
        ]}
      />
      <div className="p-6 space-y-6">
        {/* PWA Install Banner */}
        <PWAInstallBanner />

        {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title={t('fleet:loads.in_transit')}
          value={24}
          icon="🚛"
          trend={{ value: 12, isPositive: true }}
          variant="success"
        />
        <StatsCard
          title={t('fleet:metrics.fleet_utilization')}
          value="85.7%"
          icon="🚛"
          trend={{ value: 3.2, isPositive: true }}
          variant="success"
        />
        <StatsCard
          title={t('fleet:loads.today_revenue')}
          value="$47,890"
          icon="💰"
          trend={{ value: 15.3, isPositive: true }}
          variant="success"
        />
        <StatsCard
          title={t('fleet:loads.scheduled_deliveries')}
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
    </>
  );
}