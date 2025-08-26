import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { 
  CreditCard, 
  Plus, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Fuel,
  Receipt
} from "lucide-react";
import { OtherIncomeSection } from "@/components/payments/OtherIncomeSection";
import { PaymentPeriodsManager } from "@/components/payments/PaymentPeriodsManager";
import { usePaymentPeriodSummary } from "@/hooks/usePaymentPeriodSummary";
import { useCompanyPaymentPeriods } from "@/hooks/useCompanyPaymentPeriods";
import { calculateNetPayment } from "@/lib/paymentCalculations";
import { getTodayInUserTimeZone, formatCurrency } from '@/lib/dateFormatting';
import { useTranslation } from 'react-i18next';

export default function Payments() {
  const { user, isDriver, isOperationsManager, isCompanyOwner } = useAuth();
  const { t } = useTranslation('payments');
  const { companies, selectedCompany } = useUserCompanies();
  const [activeTab, setActiveTab] = useState("other-income");

  // Obtener datos reales de períodos de pago
  const currentCompanyId = selectedCompany?.id; // Compañía seleccionada
  const { data: paymentPeriods, isLoading: periodsLoading } = useCompanyPaymentPeriods(currentCompanyId);
  
  // Determinar el período actual basado en la fecha actual del usuario (zona horaria local)
  const todayUserDate = getTodayInUserTimeZone(); // YYYY-MM-DD en zona local
  
  const currentPeriod = paymentPeriods?.find(period => 
    todayUserDate >= period.period_start_date && todayUserDate <= period.period_end_date
  ) || paymentPeriods?.[0]; // Fallback al más reciente si no encuentra uno actual
  
  const previousPeriod = paymentPeriods?.find(period => 
    period.id !== currentPeriod?.id && period.period_start_date < (currentPeriod?.period_start_date || '')
  );
  
  console.log('📅 Fecha actual usuario:', todayUserDate);
  console.log('📅 Período actual encontrado:', currentPeriod?.period_start_date, 'a', currentPeriod?.period_end_date);
  console.log('📅 Período anterior encontrado:', previousPeriod?.period_start_date, 'a', previousPeriod?.period_end_date);
  
  const { data: currentPeriodSummary } = usePaymentPeriodSummary(currentPeriod?.id);
  const { data: previousPeriodSummary } = usePaymentPeriodSummary(previousPeriod?.id);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />{t('status.pending')}</Badge>;
      case "closed":
        return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />{t('status.paid')}</Badge>;
      case "processing":
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />{t('status.processing')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (periodsLoading) {
    return (
      <div className="p-2 md:p-4 space-y-6">
        <PageToolbar 
          icon={DollarSign}
          title={t('title')}
          subtitle={isDriver ? t('subtitle_driver') : t('subtitle_admin')}
        />
        <div className="text-center py-8">
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 md:p-4 space-y-6">
      <PageToolbar 
        icon={DollarSign}
        title={t('title')}
        subtitle={isDriver ? t('subtitle_driver') : t('subtitle_admin')}
      />

      {/* Resumen de período actual */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t('summary.gross_income')}</p>
                <p className="text-lg sm:text-xl font-semibold">
                  {formatCurrency(currentPeriodSummary?.gross_earnings || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t('summary.other_income')}</p>
                <p className="text-lg sm:text-xl font-semibold text-success">
                  {formatCurrency(currentPeriodSummary?.other_income || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t('summary.total_deductions')}</p>
                <p className="text-lg sm:text-xl font-semibold text-destructive">
                  -{formatCurrency(currentPeriodSummary?.deductions || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Fuel className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t('tabs.fuel_expenses')}</p>
                <p className="text-lg sm:text-xl font-semibold text-warning">
                  -{formatCurrency(currentPeriodSummary?.fuel_expenses || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t('summary.net_payment')}</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg sm:text-xl font-semibold">
                    ${formatCurrency(currentPeriodSummary?.net_payment || 0)}
                  </p>
                  {getStatusBadge(currentPeriod?.status || 'open')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Período anterior para comparación */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold">{t('period.current')}</span> {previousPeriod ? `(${previousPeriod.period_start_date} - ${previousPeriod.period_end_date})` : '(No disponible)'}
                </p>
                <p className="font-medium">
                  ${formatCurrency(previousPeriodSummary?.net_payment || 0)}
                </p>
              </div>
            </div>
            {previousPeriod && getStatusBadge(previousPeriod.status)}
          </div>
        </CardContent>
      </Card>

      {/* Tabs para diferentes secciones */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto gap-1">
          <TabsTrigger value="other-income" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('tabs.other_income')}</span>
            <span className="sm:hidden">Ingresos</span>
          </TabsTrigger>
          <TabsTrigger value="fuel-expenses" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <Fuel className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('tabs.fuel_expenses')}</span>
            <span className="sm:hidden">Fuel</span>
          </TabsTrigger>
          <TabsTrigger value="deductions" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <Receipt className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('tabs.deductions')}</span>
            <span className="sm:hidden">Gastos</span>
          </TabsTrigger>
          <TabsTrigger value="periods" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('tabs.periods')}</span>
            <span className="sm:hidden">{t('tabs.periods')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="other-income" className="space-y-6">
          <OtherIncomeSection />
        </TabsContent>

        <TabsContent value="fuel-expenses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fuel className="h-5 w-5" />
                {t('tabs.fuel_expenses')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Section under development...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deductions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                {t('tabs.deductions')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Section under development...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="periods" className="space-y-6">
          <PaymentPeriodsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}