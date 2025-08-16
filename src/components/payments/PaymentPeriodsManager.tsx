import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyPaymentPeriods } from "@/hooks/useCompanyPaymentPeriods";
import { useAllPaymentPeriodsSummary } from "@/hooks/usePaymentPeriodSummary";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, DollarSign, Users, Plus, TrendingUp, Fuel, Receipt } from "lucide-react";
import { formatPaymentPeriod, formatCurrency } from '@/lib/dateFormatting';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreateSpecialPeriodDialog } from "./CreateSpecialPeriodDialog";
import { PaymentPeriodDetails } from "./PaymentPeriodDetails";
import { useTranslation } from 'react-i18next';

export function PaymentPeriodsManager() {
  const { user } = useAuth();
  const { t } = useTranslation('payments');
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const { 
    data: periods = [], 
    isLoading,
    refetch
  } = useCompanyPaymentPeriods(user?.user_metadata?.company_id);

  const { data: periodsSummary = [] } = useAllPaymentPeriodsSummary(user?.user_metadata?.company_id);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'open': return 'default';
      case 'processing': return 'secondary';
      case 'calculated': return 'outline';
      case 'needs_review': return 'destructive';
      case 'approved': return 'default';
      case 'paid': return 'default';
      case 'locked': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'open': t('period.status.open'),
      'processing': t('period.status.processing'),
      'calculated': t('period.status.calculated'),
      'needs_review': t('period.status.needs_review'),
      'approved': t('period.status.approved'),
      'paid': t('period.status.paid'),
      'locked': t('period.status.locked')
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getPeriodTypeLabel = (type: string) => {
    const labels = {
      'regular': t('period.type.regular'),
      'special': t('period.type.special'),
      'bonus': t('period.type.bonus')
    };
    return labels[type as keyof typeof labels] || type;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-muted-foreground">{t('period.loading')}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con botón de crear período especial */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('period.title')}</h2>
          <p className="text-muted-foreground">{t('period.subtitle')}</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('period.special_period')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('period.create_special_title')}</DialogTitle>
              <DialogDescription>
                {t('period.create_special_description')}
              </DialogDescription>
            </DialogHeader>
            <CreateSpecialPeriodDialog 
              onClose={() => setShowCreateDialog(false)}
              onSuccess={() => {
                setShowCreateDialog(false);
                refetch();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('period.stats.active')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {periods.filter(p => ['open', 'processing'].includes(p.status)).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('period.stats.review_needed')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {periods.filter(p => p.status === 'needs_review').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('period.stats.ready_for_payment')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {periods.filter(p => ['calculated', 'approved'].includes(p.status)).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('period.stats.total')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{periods.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Períodos */}
      <div className="grid gap-4">
        {periods.map((period) => {
          const summary = periodsSummary.find(s => s.period_id === period.id);
          
          return (
            <Card 
              key={period.id} 
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                period.status === 'needs_review' ? 'border-destructive' : ''
              }`}
              onClick={() => setSelectedPeriod(period.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {formatPaymentPeriod(period.period_start_date, period.period_end_date)}
                    </CardTitle>
                    <CardDescription>
                      {getPeriodTypeLabel(period.period_type)} • {period.period_frequency}
                      {summary && summary.driver_count > 0 && (
                        <> • {summary.driver_count} {t('period.driver_count', { count: summary.driver_count })}</>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {period.is_locked && (
                      <Badge variant="outline">{t('period.status.locked')}</Badge>
                    )}
                    <Badge variant={getStatusBadgeVariant(period.status)}>
                      {getStatusLabel(period.status)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              {/* Conceptos financieros */}
              {summary && (
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {/* Ingresos Brutos */}
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-primary/10 rounded">
                        <DollarSign className="h-3 w-3 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('summary.gross_income')}</p>
                        <p className="text-sm font-medium">
                          ${formatCurrency(summary.gross_earnings || 0)}
                        </p>
                      </div>
                    </div>

                    {/* Otros Ingresos */}
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-success/10 rounded">
                        <TrendingUp className="h-3 w-3 text-success" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('summary.other_income')}</p>
                        <p className="text-sm font-medium text-success">
                          ${formatCurrency(summary.other_income || 0)}
                        </p>
                      </div>
                    </div>

                    {/* Deducciones */}
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-destructive/10 rounded">
                        <Receipt className="h-3 w-3 text-destructive" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('summary.total_deductions')}</p>
                        <p className="text-sm font-medium text-destructive">
                          -${formatCurrency(summary.deductions || 0)}
                        </p>
                      </div>
                    </div>

                    {/* Combustible */}
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-warning/10 rounded">
                        <Fuel className="h-3 w-3 text-warning" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('tabs.fuel_expenses')}</p>
                        <p className="text-sm font-medium text-warning">
                          -${formatCurrency(summary.fuel_expenses || 0)}
                        </p>
                      </div>
                    </div>

                    {/* Pago Neto */}
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-primary/10 rounded">
                        <DollarSign className="h-3 w-3 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('summary.net_payment')}</p>
                        <div className="flex items-center gap-1">
                          <p className={`text-sm font-medium ${
                            (summary.net_payment || 0) < 0 ? 'text-destructive' : ''
                          }`}>
                            ${formatCurrency(summary.net_payment || 0)}
                          </p>
                          {summary.drivers_with_negative_balance > 0 && (
                            <AlertTriangle className="h-3 w-3 text-destructive" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Dialog de detalles del período */}
      {selectedPeriod && (
        <Dialog open={!!selectedPeriod} onOpenChange={() => setSelectedPeriod(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('period.details_title')}</DialogTitle>
              <DialogDescription>
                {t('period.details_description')}
              </DialogDescription>
            </DialogHeader>
            <PaymentPeriodDetails 
              periodId={selectedPeriod} 
              onClose={() => setSelectedPeriod(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}