
import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DollarSign, TrendingUp, User, Circle } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatPaymentPeriod } from '@/lib/dateFormatting';
import { useTranslation } from 'react-i18next';

interface DriverPayment {
  period_id: string; // Unique ID for the period
  driver_id: string;
  driver_name: string;
  driver_avatar?: string;
  period_dates: string;
  gross_earnings: number;
  fuel_expenses: number;
  total_deductions: number;
  net_payment: number;
  status: 'calculated' | 'paid' | 'pending';
  has_negative_balance: boolean;
}

export function RealtimeDriverPayments() {
  const { userRole } = useAuth();
  const { t } = useTranslation('dashboard');
  const [payments, setPayments] = useState<DriverPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const updateTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced update function to reduce excessive API calls
  const debouncedUpdate = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(() => {
      fetchDriverPayments();
    }, 2000); // Wait 2 seconds before updating
  }, []);

  useEffect(() => {
    if (userRole?.company_id) {
      fetchDriverPayments();
      
      // Use a more targeted realtime subscription with less frequent updates
      const channel = supabase
        .channel(`driver_payments_${userRole.company_id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_payrolls',
            // Only listen for payment status changes
            filter: `payment_status=neq.calculated`
          },
          debouncedUpdate
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'company_payment_periods',
            filter: `company_id=eq.${userRole.company_id}`
          },
          debouncedUpdate
        )
        .subscribe();

      return () => {
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        supabase.removeChannel(channel);
      };
    }
  }, [userRole?.company_id, debouncedUpdate]);

  const fetchDriverPayments = async () => {
    if (!userRole?.company_id) return;

    try {
      // Get latest user payment periods for the company
      const { data: periods, error } = await supabase
        .from('user_payrolls')
        .select('*')
        .eq('company_id', userRole.company_id)
        .order('period_start_date', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (periods && periods.length > 0) {
        // Get profiles for all drivers in these periods
        const driverIds = periods.map((calc: any) => calc.user_id);
        
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, avatar_url')
          .in('user_id', driverIds);

        if (profilesError) throw profilesError;

        // Create a map of driver profiles for easy lookup
        const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        const driverPayments = periods.map((calculation: any) => {
          const profile = profilesMap.get(calculation.user_id);
          return {
            period_id: calculation.id, // Use unique period ID
            driver_id: calculation.user_id,
            driver_name: profile ? `${profile.first_name || 'N/A'} ${profile.last_name || ''}`.trim() : 'Driver',
            driver_avatar: profile?.avatar_url,
            period_dates: formatPaymentPeriod(calculation.period_start_date, calculation.period_end_date),
            gross_earnings: calculation.gross_earnings || 0,
            fuel_expenses: calculation.fuel_expenses || 0,
            total_deductions: calculation.total_deductions || 0,
            net_payment: calculation.net_payment || 0,
            status: calculation.payment_status || 'calculated',
            has_negative_balance: calculation.has_negative_balance || false,
          };
        });

        setPayments(driverPayments);
      }
    } catch (error) {
      console.error('Error fetching driver payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'calculated': return 'secondary';
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            {t('owner.payments.realtime_title')}
            <Circle className="h-2 w-2 text-green-500 fill-current animate-pulse" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          {t('owner.payments.realtime_title')}
          <Circle className="h-2 w-2 text-green-500 fill-current animate-pulse" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t('owner.payments.no_periods_available')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div key={payment.period_id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={payment.driver_avatar} alt={payment.driver_name} />
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold">{payment.driver_name}</h4>
                      <p className="text-sm text-muted-foreground">{payment.period_dates}</p>
                    </div>
                  </div>
                  <Badge variant={getStatusBadgeVariant(payment.status)}>
                    {t(`owner.payments.status.${payment.status}`)}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('owner.payments.gross_income')}</p>
                    <p className="font-semibold text-green-600">{formatCurrency(payment.gross_earnings)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('owner.payments.fuel')}</p>
                    <p className="font-semibold text-red-600">-{formatCurrency(Math.abs(payment.fuel_expenses))}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('owner.payments.deductions')}</p>
                    <p className="font-semibold text-red-600">-{formatCurrency(Math.abs(payment.total_deductions))}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('owner.payments.net_payment')}</p>
                    <p className={`font-bold ${payment.has_negative_balance ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(payment.net_payment)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
