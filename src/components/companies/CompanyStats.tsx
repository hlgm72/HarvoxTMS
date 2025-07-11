import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, TrendingUp, AlertTriangle } from "lucide-react";
import { useTranslation } from 'react-i18next';

interface Company {
  id: string;
  name: string;
  plan_type?: string;
  status?: string;
  created_at: string;
}

interface CompanyStatsProps {
  companies: Company[];
}

export function CompanyStats({ companies }: CompanyStatsProps) {
  const { t } = useTranslation('admin');
  
  const totalCompanies = companies.length;
  const activeCompanies = companies.filter(c => c.status === 'active').length;
  const planCounts = companies.reduce((acc, company) => {
    const plan = company.plan_type || 'basic';
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const recentCompanies = companies.filter(company => {
    const createdDate = new Date(company.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return createdDate >= thirtyDaysAgo;
  }).length;

  const stats = [
    {
      title: t('pages.companies.stats.total_companies'),
      value: totalCompanies,
      icon: Building2,
      description: t('pages.companies.stats.total_companies_desc', { defaultValue: "Registered companies" }),
    },
    {
      title: t('pages.companies.stats.active_companies'),
      value: activeCompanies,
      icon: Users,
      description: `${Math.round((activeCompanies / totalCompanies) * 100)}% ${t('pages.companies.stats.of_total', { defaultValue: "of total" })}`,
    },
    {
      title: t('pages.companies.stats.new_this_month'),
      value: recentCompanies,
      icon: TrendingUp,
      description: t('pages.companies.stats.recent_companies_desc', { defaultValue: "Recent companies" }),
    },
    {
      title: t('pages.companies.stats.premium_enterprise', { defaultValue: "Premium/Enterprise" }),
      value: (planCounts.premium || 0) + (planCounts.enterprise || 0),
      icon: AlertTriangle,
      description: t('pages.companies.stats.paid_plans', { defaultValue: "Paid plans" }),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}