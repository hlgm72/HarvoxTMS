import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, 
  TrendingUp, 
  Fuel, 
  Receipt, 
  Calendar,
  Eye,
  Download,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, calculateNetPayment, calculateTotalIncome } from "@/lib/paymentCalculations";
import { getCurrentUTC, formatDateAuto, formatDateInUserTimeZone } from "@/lib/dateFormatting";
import { FinancialCharts } from "./FinancialCharts";

interface FinancialData {
  currentPeriod: {
    gross_earnings: number;
    other_income: number;
    fuel_expenses: number;
    total_deductions: number;
    net_payment: number;
    period_start: string;
    period_end: string;
    status: string;
  };
  weeklyStats: {
    loads_completed: number;
    miles_driven: number;
    avg_rate_per_mile: number;
    next_payment_date: string;
  };
  fuelCard: {
    balance: number;
    last_transaction: string;
    weekly_spend: number;
  };
}

interface FinancialSummaryProps {
  className?: string;
}

export function FinancialSummary({ className }: FinancialSummaryProps) {
  const { t } = useTranslation(['common', 'dashboard']);
  const { user } = useAuth();

  // Fetch current period financial data
  const { data: financialData, isLoading, refetch } = useQuery({
    queryKey: ['driver-financial-summary', user?.id],
    queryFn: async (): Promise<FinancialData> => {
      if (!user?.id) throw new Error('No user ID');

      // Get current payment period calculation
      const { data: currentCalculation, error: calcError } = await supabase
        .from('driver_period_calculations')
        .select(`
          *,
          company_payment_periods (
            period_start_date,
            period_end_date,
            status
          )
        `)
        .eq('driver_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (calcError && calcError.code !== 'PGRST116') throw calcError;

      // Get loads stats for current period
      const { data: loadsStats, error: loadsError } = await supabase
        .from('loads')
        .select('total_amount')
        .eq('driver_user_id', user.id)
        .eq('status', 'delivered')
        .gte('delivery_date', currentCalculation?.company_payment_periods?.period_start_date || getCurrentUTC())
        .lte('delivery_date', currentCalculation?.company_payment_periods?.period_end_date || getCurrentUTC());

      if (loadsError) throw loadsError;

      // Mock data for now - would come from real fuel API
      const totalMiles = 1200;
      const totalEarnings = currentCalculation?.gross_earnings || 0;
      const weeklyFuelSpend = currentCalculation?.fuel_expenses || 0;

      return {
        currentPeriod: {
          gross_earnings: currentCalculation?.gross_earnings || 0,
          other_income: currentCalculation?.other_income || 0,
          fuel_expenses: currentCalculation?.fuel_expenses || 0,
          total_deductions: currentCalculation?.total_deductions || 0,
          net_payment: currentCalculation ? calculateNetPayment(currentCalculation) : 0,
          period_start: currentCalculation?.company_payment_periods?.period_start_date || '',
          period_end: currentCalculation?.company_payment_periods?.period_end_date || '',
          status: currentCalculation?.payment_status || 'calculated'
        },
        weeklyStats: {
          loads_completed: loadsStats?.length || 0,
          miles_driven: totalMiles,
          avg_rate_per_mile: totalMiles > 0 ? totalEarnings / totalMiles : 0,
          next_payment_date: getNextPaymentDate()
        },
        fuelCard: {
          balance: 1500,
          last_transaction: getCurrentUTC(),
          weekly_spend: weeklyFuelSpend
        }
      };
    },
    enabled: !!user?.id,
    refetchInterval: 30000 // Refresh every 30 seconds for live data
  });

  function getNextPaymentDate(): string {
    const now = new Date();
    const nextFriday = new Date(now);
    nextFriday.setDate(now.getDate() + (5 - now.getDay() + 7) % 7);
    return formatDateInUserTimeZone(nextFriday);
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'calculated': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string): string => {
    return t(`dashboard:financial.status.${status}`, { defaultValue: status });
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t('dashboard:financial.loading')}
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!financialData) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('dashboard:financial.no_data')}</h3>
          <p className="text-muted-foreground">
            {t('dashboard:financial.no_data_description')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { currentPeriod, weeklyStats, fuelCard } = financialData;

  return (
    <div className={className}>
      {/* Financial Charts Section */}
      <FinancialCharts 
        currentPeriodData={currentPeriod}
        className="mb-6"
      />
      
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-3 gap-1">
          <TabsTrigger value="summary">{t('dashboard:financial.tabs.summary')}</TabsTrigger>
          <TabsTrigger value="period">{t('dashboard:financial.tabs.period')}</TabsTrigger>
          <TabsTrigger value="fuel">{t('dashboard:financial.tabs.fuel')}</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          {/* Current Net Payment */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-green-800 flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {t('dashboard:financial.current_net_payment')}
                </CardTitle>
                <Badge className={getStatusColor(currentPeriod.status)}>
                  {getStatusText(currentPeriod.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900 mb-2">
                {formatCurrency(currentPeriod.net_payment)}
              </div>
              <p className="text-green-700 text-sm">
                {formatDateAuto(currentPeriod.period_start)} - {formatDateAuto(currentPeriod.period_end)}
              </p>
            </CardContent>
          </Card>

          {/* Weekly Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('dashboard:financial.stats.loads')}</p>
                    <p className="text-2xl font-bold">{weeklyStats.loads_completed}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('dashboard:financial.stats.miles')}</p>
                    <p className="text-2xl font-bold">{weeklyStats.miles_driven.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('dashboard:financial.stats.per_mile')}</p>
                    <p className="text-2xl font-bold">${weeklyStats.avg_rate_per_mile.toFixed(2)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('dashboard:financial.stats.next_payment')}</p>
                    <p className="text-sm font-medium">
                      {formatDateAuto(weeklyStats.next_payment_date)}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="period" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t('dashboard:financial.period_detail')}</span>
                <Button size="sm" variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  {t('dashboard:financial.actions.view_report')}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('dashboard:financial.breakdown.gross_earnings')}</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(currentPeriod.gross_earnings)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('dashboard:financial.breakdown.other_income')}</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(currentPeriod.other_income)}
                  </span>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('dashboard:financial.breakdown.fuel_expenses')}</span>
                  <span className="font-semibold text-red-600">
                    -{formatCurrency(currentPeriod.fuel_expenses)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('dashboard:financial.breakdown.other_deductions')}</span>
                  <span className="font-semibold text-red-600">
                    -{formatCurrency(currentPeriod.total_deductions)}
                  </span>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <span className="font-medium">{t('dashboard:financial.breakdown.net_payment')}</span>
                  <span className="font-bold text-lg text-green-600">
                    {formatCurrency(currentPeriod.net_payment)}
                  </span>
                </div>
              </div>

              <Button className="w-full mt-4" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                {t('dashboard:financial.actions.download_receipt')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fuel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fuel className="h-5 w-5" />
                {t('dashboard:financial.fuel_card')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('dashboard:financial.fuel.available_balance')}</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(fuelCard.balance)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('dashboard:financial.fuel.weekly_spend')}</span>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(fuelCard.weekly_spend)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('dashboard:financial.fuel.last_transaction')}</span>
                  <span className="text-sm">
                    {fuelCard.last_transaction ? 
                      formatDateAuto(fuelCard.last_transaction) : 
                      t('dashboard:financial.fuel.no_transactions')
                    }
                  </span>
                </div>
              </div>

              <Separator />

              {/* Fuel usage progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('dashboard:financial.fuel.weekly_limit_usage')}</span>
                  <span>{((fuelCard.weekly_spend / 800) * 100).toFixed(0)}%</span>
                </div>
                <Progress value={(fuelCard.weekly_spend / 800) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {t('dashboard:financial.fuel.weekly_limit')}
                </p>
              </div>

              <Button className="w-full" variant="outline">
                <Receipt className="h-4 w-4 mr-2" />
                {t('dashboard:financial.fuel.view_history')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}