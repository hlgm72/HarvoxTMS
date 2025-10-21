import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useFleetNotifications } from "@/components/notifications";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from '@/lib/dateFormatting';
import { Loader2, Calendar as CalendarIcon, DollarSign, CheckCircle2, CreditCard, Building, Check } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

interface MarkDriverPaidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calculationId: string;
  driverName: string;
  netPayment: number;
  onSuccess?: () => void;
}

export function MarkDriverPaidDialog({
  open,
  onOpenChange,
  calculationId,
  driverName,
  netPayment,
  onSuccess
}: MarkDriverPaidDialogProps) {
  const { t } = useTranslation('payments');
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [formData, setFormData] = useState({
    paymentDate: new Date(),
    paymentMethod: "",
    paymentReference: "",
    notes: ""
  });

  const paymentMethods = [
    { value: "bank_transfer", label: t("mark_paid_dialog.payment_methods.bank_transfer"), icon: Building },
    { value: "check", label: t("mark_paid_dialog.payment_methods.check"), icon: CreditCard },
    { value: "cash", label: t("mark_paid_dialog.payment_methods.cash"), icon: DollarSign },
    { value: "payment_app", label: t("mark_paid_dialog.payment_methods.payment_app"), icon: CreditCard },
    { value: "other", label: t("mark_paid_dialog.payment_methods.other"), icon: CreditCard }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.paymentMethod) {
      showError(t("mark_paid_dialog.validation.method_required"));
      return;
    }

    setIsLoading(true);
    try {
      // 🚀 OPTIMIZACIÓN: Usar RPC ACID en lugar de múltiples queries
      // Reduce de 4 llamadas a la BD a solo 1 transacción atómica
      const { data, error } = await supabase.rpc('mark_driver_as_paid_with_validation', {
        calculation_id: calculationId,
        payment_method_used: formData.paymentMethod,
        payment_ref: formData.paymentReference || null,
        notes: formData.notes || null
      });

      if (error) throw error;
      
      if (!(data as any)?.success) {
        throw new Error((data as any)?.message || 'Error marking driver as paid');
      }

      showSuccess(
        t("mark_paid_dialog.notifications.success_title"),
        t("mark_paid_dialog.notifications.success_message", { driverName })
      );
      
      // ⚡ OPTIMIZACIÓN: No usar await en invalidaciones (no es necesario bloquear la UI)
      queryClient.invalidateQueries({ queryKey: ['payment-calculations-reports'] });
      queryClient.invalidateQueries({ queryKey: ['payment-reports-stats'] });
      queryClient.invalidateQueries({ queryKey: ['eventual-deductions'] });
      queryClient.invalidateQueries({ queryKey: ['user-payrolls'] });
      
      // Reset form
      setFormData({
        paymentDate: new Date(),
        paymentMethod: "",
        paymentReference: "",
        notes: ""
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error marking driver as paid:', error);
      
      // Proporcionar mensajes de error más específicos
      let errorMessage = error.message || t("mark_paid_dialog.notifications.error_unexpected");
      if (errorMessage.includes('ERROR_ALREADY_PAID')) {
        errorMessage = 'El conductor ya está marcado como pagado';
      } else if (errorMessage.includes('ERROR_CALCULATION_NOT_FOUND')) {
        errorMessage = 'No se encontró el cálculo de pago';
      }
      
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            {t("mark_paid_dialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("mark_paid_dialog.description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Driver Info */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-foreground">{driverName}</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(netPayment)}
              </p>
            </div>
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="paymentDate">{t("mark_paid_dialog.payment_date_required")}</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.paymentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.paymentDate ? format(formData.paymentDate, "PPP") : t("mark_paid_dialog.payment_date_placeholder")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.paymentDate}
                  onSelect={(date) => {
                    if (date) {
                      setFormData(prev => ({ ...prev, paymentDate: date }));
                      setCalendarOpen(false);
                    }
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              {t("mark_paid_dialog.payment_date_description")}
            </p>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">{t("mark_paid_dialog.payment_method_required")}</Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("mark_paid_dialog.payment_method_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => {
                  const IconComponent = method.icon;
                  return (
                    <SelectItem key={method.value} value={method.value}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        {method.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Reference */}
          <div className="space-y-2">
            <Label htmlFor="paymentReference">{t("mark_paid_dialog.reference_number")}</Label>
            <Input
              id="paymentReference"
              placeholder={t("mark_paid_dialog.reference_placeholder")}
              value={formData.paymentReference}
              onChange={(e) => setFormData(prev => ({ ...prev, paymentReference: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              {t("mark_paid_dialog.reference_description")}
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t("mark_paid_dialog.notes")}</Label>
            <Textarea
              id="notes"
              placeholder={t("mark_paid_dialog.notes_placeholder")}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              {t("mark_paid_dialog.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.paymentMethod}
              className="flex-1 relative overflow-hidden group"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span className="animate-pulse">{t("mark_paid_dialog.processing")}</span>
                  <div className="absolute inset-0 -translate-x-full group-disabled:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000" />
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4 transition-transform group-hover:scale-110 group-hover:rotate-12" />
                  {t("mark_paid_dialog.submit")}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}