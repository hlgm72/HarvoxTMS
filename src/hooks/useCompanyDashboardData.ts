import { useMemo } from "react";
import { Company } from "@/types/company";

export function useCompanyDashboardData(companies: Company[]) {
  return useMemo(() => {
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
}