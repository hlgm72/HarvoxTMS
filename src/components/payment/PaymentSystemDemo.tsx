import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PaymentReportDialog } from './PaymentReportDialog';
import { PaymentMethodManager } from './PaymentMethodManager';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  CreditCard,
  Smartphone,
  Building,
  FileText
} from 'lucide-react';

// Demo data para mostrar el funcionamiento
const demoPaymentPeriods = [
  {
    id: 'demo-period-1',
    driver_name: 'María González',
    period_dates: '1-7 Enero 2025',
    net_payment: 1250.00,
    status: 'approved',
    is_locked: false
  },
  {
    id: 'demo-period-2', 
    driver_name: 'Carlos Rodríguez',
    period_dates: '1-7 Enero 2025',
    net_payment: 980.50,
    status: 'paid',
    is_locked: true,
    payment_method: 'Zelle',
    payment_reference: 'ZE789123456'
  },
  {
    id: 'demo-period-3',
    driver_name: 'Ana López',
    period_dates: '1-7 Enero 2025', 
    net_payment: 1450.75,
    status: 'paid',
    is_locked: true,
    payment_method: 'Stripe Connect',
    payment_reference: 'ST_1234567890'
  }
];

export const PaymentSystemDemo = () => {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [showManager, setShowManager] = useState(false);
  const { paymentMethods } = usePaymentMethods();

  const selectedPeriod = demoPaymentPeriods.find(p => p.id === selectedPeriodId);

  const getStatusIcon = (status: string, isLocked: boolean) => {
    if (isLocked) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (status === 'approved') return <Clock className="h-4 w-4 text-amber-600" />;
    return <AlertCircle className="h-4 w-4 text-blue-600" />;
  };

  const getStatusBadge = (status: string, isLocked: boolean) => {
    if (isLocked) return <Badge className="bg-green-100 text-green-800">Pagado y Bloqueado</Badge>;
    if (status === 'approved') return <Badge variant="outline" className="border-amber-500 text-amber-700">Listo para Pago</Badge>;
    return <Badge variant="secondary">En Proceso</Badge>;
  };

  const getPaymentMethodIcon = (paymentMethod?: string) => {
    if (!paymentMethod) return null;
    
    if (paymentMethod.includes('Stripe')) return <CreditCard className="h-4 w-4" />;
    if (paymentMethod.includes('Zelle')) return <Smartphone className="h-4 w-4" />;
    if (paymentMethod.includes('Banco')) return <Building className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sistema Universal de Pagos</h2>
          <p className="text-muted-foreground">
            Gestiona pagos con cualquier método: Stripe, Zelle, bancos, o cualquier app de pagos
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setShowManager(!showManager)}
        >
          {showManager ? 'Ver Demo' : 'Gestionar Métodos'}
        </Button>
      </div>

      {showManager ? (
        <PaymentMethodManager companyId="demo-company-id" />
      ) : (
        <>
          {/* Demo Periods */}
          <div className="grid gap-4">
            <h3 className="text-lg font-semibold">Períodos de Pago - Demo</h3>
            
            {demoPaymentPeriods.map((period) => (
              <Card key={period.id} className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{period.driver_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{period.period_dates}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">${period.net_payment.toFixed(2)}</div>
                      {getStatusBadge(period.status, period.is_locked)}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(period.status, period.is_locked)}
                      
                      {period.payment_method && (
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(period.payment_method)}
                          <span className="text-sm font-medium">{period.payment_method}</span>
                          {period.payment_reference && (
                            <Badge variant="outline" className="text-xs">
                              Ref: {period.payment_reference}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {!period.is_locked && period.status === 'approved' && (
                      <Button 
                        onClick={() => setSelectedPeriodId(period.id)}
                        className="flex items-center gap-2"
                      >
                        <DollarSign className="h-4 w-4" />
                        Reportar Pago
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Features Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Características del Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Métodos Soportados
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Stripe Connect (Automático)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Zelle (Manual + Reporte)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Transferencias Bancarias
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      PayPal, Cash App, Venmo
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Cualquier método personalizado
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Funcionalidades
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Reporte manual de pagos
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Números de referencia
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Bloqueo automático de períodos
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Historial de pagos
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Verificación de montos
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Payment Report Dialog */}
      {selectedPeriod && (
        <PaymentReportDialog
          isOpen={!!selectedPeriodId}
          onClose={() => setSelectedPeriodId(null)}
          periodId={selectedPeriod.id}
          expectedAmount={selectedPeriod.net_payment}
          onPaymentReported={() => {
            // En una implementación real, recargaría los datos
            console.log('Payment reported for period:', selectedPeriod.id);
          }}
        />
      )}
    </div>
  );
};