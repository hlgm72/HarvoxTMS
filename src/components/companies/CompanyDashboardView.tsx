import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// Dashboard view with statistical cards instead of charts

interface Company {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  street_address: string;
  state_id: string;
  zip_code: string;
  plan_type?: string;
  status?: string;
  owner_name?: string;
  owner_phone?: string;
  owner_email?: string;
  owner_title?: string;
  max_users?: number;
  max_vehicles?: number;
  created_at: string;
}

interface CompanyDashboardViewProps {
  companies: Company[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function CompanyDashboardView({ companies }: CompanyDashboardViewProps) {
  const chartData = useMemo(() => {
    // Plan distribution
    const planData = companies.reduce((acc, company) => {
      const plan = company.plan_type || 'basic';
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const planChartData = Object.entries(planData).map(([plan, count]) => ({
      name: plan.charAt(0).toUpperCase() + plan.slice(1),
      value: count,
    }));

    // Status distribution
    const statusData = companies.reduce((acc, company) => {
      const status = company.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusChartData = Object.entries(statusData).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
    }));

    // State distribution
    const stateData = companies.reduce((acc, company) => {
      const state = company.state_id;
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const stateChartData = Object.entries(stateData).map(([state, count]) => ({
      state,
      empresas: count,
    }));

    // Monthly growth (last 12 months)
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM

      const count = companies.filter(company => {
        const companyDate = new Date(company.created_at);
        return companyDate.toISOString().slice(0, 7) === monthKey;
      }).length;

      return {
        month: date.toLocaleDateString('es-ES', { month: 'short' }),
        empresas: count,
      };
    }).reverse();

    // Recent companies (last 30 days)
    const recentCompanies = companies
      .filter(company => {
        const createdDate = new Date(company.created_at);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return createdDate >= thirtyDaysAgo;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    return { planChartData, statusChartData, stateChartData, monthlyData, recentCompanies };
  }, [companies]);

  const getPlanBadge = (planType?: string) => {
    switch (planType) {
      case 'basic':
        return <Badge variant="outline">Básico</Badge>;
      case 'premium':
        return <Badge variant="default" className="bg-blue-500">Premium</Badge>;
      case 'enterprise':
        return <Badge variant="default" className="bg-purple-500">Enterprise</Badge>;
      case 'trial':
        return <Badge variant="secondary">Prueba</Badge>;
      case 'demo':
        return <Badge variant="secondary">Demo</Badge>;
      default:
        return <Badge variant="outline">Básico</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Plan</CardTitle>
            <CardDescription>Número de empresas por tipo de plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {chartData.planChartData.map((plan, index) => (
                <div key={plan.name} className="p-4 border rounded-lg">
                  <div className="font-medium">{plan.name}</div>
                  <div className="text-2xl font-bold">{plan.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Estado de las Empresas</CardTitle>
            <CardDescription>Distribución por estado de actividad</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {chartData.statusChartData.map((status, index) => (
                <div key={status.name} className="p-4 border rounded-lg">
                  <div className="font-medium">{status.name}</div>
                  <div className="text-2xl font-bold">{status.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Geographic Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución Geográfica</CardTitle>
            <CardDescription>Empresas por estado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {chartData.stateChartData.map((item) => (
                <div key={item.state} className="flex justify-between items-center p-2 bg-muted rounded">
                  <span className="font-medium">{item.state}</span>
                  <span className="text-lg font-bold">{item.empresas}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Growth */}
        <Card>
          <CardHeader>
            <CardTitle>Crecimiento Mensual</CardTitle>
            <CardDescription>Nuevas empresas por mes (últimos 12 meses)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {chartData.monthlyData.map((item) => (
                <div key={item.month} className="flex justify-between items-center p-2 bg-muted rounded">
                  <span className="font-medium">{item.month}</span>
                  <span className="text-lg font-bold">{item.empresas}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Companies */}
      <Card>
        <CardHeader>
          <CardTitle>Empresas Recientes</CardTitle>
          <CardDescription>Últimas 5 empresas registradas (30 días)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {chartData.recentCompanies.map((company) => (
              <div key={company.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium">{company.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(company.created_at).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getPlanBadge(company.plan_type)}
                  <div className="text-sm text-muted-foreground">
                    {company.state_id}
                  </div>
                </div>
              </div>
            ))}
            {chartData.recentCompanies.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No hay empresas recientes
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}