import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/paymentCalculations";

interface DriverCalculation {
  id: string;
  driver_user_id: string;
  gross_earnings: number;
  fuel_expenses: number;
  total_deductions: number;
  other_income: number;
  net_payment: number;
  payment_status: string;
  updated_at: string;
  company_payment_period_id: string;
  period_start_date: string;
  period_end_date: string;
  driver_name: string;
}

export function RealtimeDriverPayments() {
  const [realtimeData, setRealtimeData] = useState<DriverCalculation[]>([]);

  // Obtener datos iniciales de cálculos de conductores
  const { data: initialData, isLoading } = useQuery({
    queryKey: ['realtime-driver-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_period_calculations')
        .select(`
          id,
          driver_user_id,
          gross_earnings,
          fuel_expenses,
          total_deductions,
          other_income,
          net_payment,
          payment_status,
          updated_at,
          company_payment_period_id,
          company_payment_periods!inner(
            period_start_date,
            period_end_date,
            status
          )
        `)
        .eq('company_payment_periods.status', 'open')
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Obtener nombres de conductores por separado
      const driverIds = data.map(calc => calc.driver_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', driverIds);

      return data.map(calc => ({
        ...calc,
        period_start_date: calc.company_payment_periods.period_start_date,
        period_end_date: calc.company_payment_periods.period_end_date,
        driver_name: profiles?.find(p => p.user_id === calc.driver_user_id)
          ? `${profiles.find(p => p.user_id === calc.driver_user_id)?.first_name} ${profiles.find(p => p.user_id === calc.driver_user_id)?.last_name}`
          : 'Conductor'
      }));
    }
  });

  // Configurar actualizaciones en tiempo real
  useEffect(() => {
    if (initialData) {
      setRealtimeData(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    const channel = supabase
      .channel('driver-payments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_period_calculations'
        },
        async (payload) => {
          console.log('💰 Realtime payment update:', payload);
          
          if (payload.eventType === 'UPDATE') {
            // Obtener datos completos del registro actualizado
            const { data: updatedCalc } = await supabase
              .from('driver_period_calculations')
              .select(`
                id,
                driver_user_id,
                gross_earnings,
                fuel_expenses,
                total_deductions,
                other_income,
                net_payment,
                payment_status,
                updated_at,
                company_payment_period_id,
                company_payment_periods!inner(
                  period_start_date,
                  period_end_date
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (updatedCalc) {
              // Obtener nombre del conductor por separado
              const { data: profile } = await supabase
                .from('profiles')
                .select('first_name, last_name')
                .eq('user_id', updatedCalc.driver_user_id)
                .single();

              const formattedCalc = {
                ...updatedCalc,
                period_start_date: updatedCalc.company_payment_periods.period_start_date,
                period_end_date: updatedCalc.company_payment_periods.period_end_date,
                driver_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Conductor'
              };

              setRealtimeData(prev => {
                const index = prev.findIndex(item => item.id === payload.new.id);
                if (index >= 0) {
                  const newData = [...prev];
                  newData[index] = formattedCalc;
                  return newData;
                }
                return [formattedCalc, ...prev.slice(0, 9)];
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'loads'
        },
        (payload) => {
          console.log('🚛 Realtime load update:', payload);
          // Los triggers automáticamente recalcularán los pagos
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusBadge = (status: string) => {
    const variants = {
      'projected': { label: 'Proyectado', variant: 'secondary' as const, icon: Clock },
      'partial': { label: 'Parcial', variant: 'default' as const, icon: TrendingUp },
      'calculated': { label: 'Calculado', variant: 'default' as const, icon: CheckCircle },
      'needs_review': { label: 'Revisar', variant: 'destructive' as const, icon: DollarSign },
      'paid': { label: 'Pagado', variant: 'default' as const, icon: CheckCircle }
    };

    const config = variants[status as keyof typeof variants] || variants.calculated;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pagos de Conductores en Tiempo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Pagos de Conductores en Tiempo Real
          <Badge variant="outline" className="ml-auto animate-pulse">
            🔴 En Vivo
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {realtimeData.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No hay cálculos de pago activos
            </p>
          ) : (
            realtimeData.map((calc) => (
              <div 
                key={calc.id} 
                className="border rounded-lg p-4 space-y-3 transition-all duration-300 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{calc.driver_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {calc.period_start_date} - {calc.period_end_date}
                    </p>
                  </div>
                  {getStatusBadge(calc.payment_status)}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Ingresos Brutos</p>
                    <p className="font-medium text-green-600">
                      {formatCurrency(calc.gross_earnings)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Combustible</p>
                    <p className="font-medium text-red-600">
                      -{formatCurrency(calc.fuel_expenses)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Deducciones</p>
                    <p className="font-medium text-red-600">
                      -{formatCurrency(calc.total_deductions)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Pago Neto</p>
                    <p className={`font-bold ${calc.net_payment >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(calc.net_payment)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}