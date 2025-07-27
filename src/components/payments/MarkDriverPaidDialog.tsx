import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFleetNotifications } from "@/components/notifications";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, CreditCard, Building, Check } from "lucide-react";

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
  const { showSuccess, showError } = useFleetNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    paymentMethod: "",
    paymentReference: "",
    notes: ""
  });

  const paymentMethods = [
    { value: "bank_transfer", label: "Transferencia Bancaria", icon: Building },
    { value: "check", label: "Cheque", icon: CreditCard },
    { value: "cash", label: "Efectivo", icon: DollarSign },
    { value: "payment_app", label: "App de Pago (Zelle, etc.)", icon: CreditCard },
    { value: "other", label: "Otro", icon: CreditCard }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.paymentMethod) {
      showError("Selecciona un método de pago");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('mark_driver_as_paid', {
        calculation_id: calculationId,
        payment_method_used: formData.paymentMethod,
        payment_ref: formData.paymentReference || null,
        notes: formData.notes || null
      });

      if (error) throw error;

      const result = data as { success?: boolean; message?: string };
      if (result?.success) {
        showSuccess("Pago Registrado", `Se ha marcado a ${driverName} como pagado exitosamente`);
        onOpenChange(false);
        onSuccess?.();
        
        // Reset form
        setFormData({
          paymentMethod: "",
          paymentReference: "",
          notes: ""
        });
      } else {
        showError(result?.message || "No se pudo registrar el pago");
      }
    } catch (error: any) {
      console.error('Error marking driver as paid:', error);
      showError(error.message || "Error al registrar el pago");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            Marcar como Pagado
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Driver Info */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="font-medium">{driverName}</p>
            <p className="text-lg font-bold text-green-600">
              ${netPayment.toLocaleString('es-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Método de Pago *</Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar método de pago" />
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
            <Label htmlFor="paymentReference">Número de Referencia</Label>
            <Input
              id="paymentReference"
              placeholder="Ej: #12345, TXN-ABC123, Cheque #456"
              value={formData.paymentReference}
              onChange={(e) => setFormData(prev => ({ ...prev, paymentReference: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Número de transacción, cheque, o referencia del pago
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Información adicional sobre el pago..."
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
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.paymentMethod}
              className="flex-1"
            >
              {isLoading ? "Procesando..." : "Marcar como Pagado"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}