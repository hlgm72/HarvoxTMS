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
import { DollarSign, CreditCard, Building, Check, CalendarIcon } from "lucide-react";
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
      // Obtener el userId ANTES del update para mejor performance
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      // Actualizar directamente usando user_payrolls
      const { error } = await supabase
        .from('user_payrolls')
        .update({
          payment_status: 'paid',
          actual_payment_date: format(formData.paymentDate, 'yyyy-MM-dd'),
          payment_method: formData.paymentMethod,
          payment_reference: formData.paymentReference || null,
          payment_notes: formData.notes || null,
          paid_at: new Date().toISOString(),
          paid_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', calculationId);

      if (error) throw error;

      showSuccess(
        t("mark_paid_dialog.notifications.success_title"),
        t("mark_paid_dialog.notifications.success_message", { driverName })
      );
      
      // Invalidar queries específicas en lugar de refetch general
      await queryClient.invalidateQueries({ 
        queryKey: ['payment-calculations-reports']
      });
      await queryClient.invalidateQueries({ 
        queryKey: ['payment-reports-stats']
      });
      
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
      showError(error.message || t("mark_paid_dialog.notifications.error_unexpected"));
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
              className="flex-1"
            >
              {isLoading ? t("mark_paid_dialog.processing") : t("mark_paid_dialog.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}