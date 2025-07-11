import { Company } from "@/types/company";
import { useCompanyDashboardData } from "@/hooks/useCompanyDashboardData";
import { PlanDistributionCard } from "./dashboard/PlanDistributionCard";
import { StatusDistributionCard } from "./dashboard/StatusDistributionCard";
import { GeographicDistributionCard } from "./dashboard/GeographicDistributionCard";
import { MonthlyGrowthCard } from "./dashboard/MonthlyGrowthCard";
import { RecentCompaniesCard } from "./dashboard/RecentCompaniesCard";

interface CompanyDashboardViewProps {
  companies: Company[];
}

export function CompanyDashboardView({ companies }: CompanyDashboardViewProps) {
  const chartData = useCompanyDashboardData(companies);

  return (
    <div className="space-y-6">
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PlanDistributionCard data={chartData.planChartData} />
        <StatusDistributionCard data={chartData.statusChartData} />
        <GeographicDistributionCard data={chartData.stateChartData} />
        <MonthlyGrowthCard data={chartData.monthlyData} />
      </div>

      {/* Recent Companies */}
      <RecentCompaniesCard companies={chartData.recentCompanies} />
    </div>
  );
}