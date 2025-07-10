import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Receipt, FileText, CreditCard } from 'lucide-react';

interface PaymentReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  periodId: string;
  expectedAmount: number;
  onPaymentReported?: () => void;
}

export const PaymentReportDialog = ({ 
  isOpen, 
  onClose, 
  periodId, 
  expectedAmount,
  onPaymentReported 
}: PaymentReportDialogProps) => {
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [amount, setAmount] = useState<string>(expectedAmount.toString());
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { paymentMethods, reportPayment, isLoading } = usePaymentMethods();
  const { toast } = useToast();

  const selectedMethod = paymentMethods.find(method => method.id === selectedMethodId);
  const amountNumber = parseFloat(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMethodId) {
      toast({
        title: "Error",
        description: "Selecciona un método de pago",
        variant: "destructive"
      });
      return;
    }

    if (amountNumber <= 0) {
      toast({
        title: "Error", 
        description: "El monto debe ser mayor a $0",
        variant: "destructive"
      });
      return;
    }

    if (selectedMethod?.requires_reference && !referenceNumber.trim()) {
      toast({
        title: "Error",
        description: "Este método de pago requiere número de referencia",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    const success = await reportPayment(
      periodId,
      selectedMethodId,
      amountNumber,
      referenceNumber.trim() || undefined,
      notes.trim() || undefined
    );

    if (success) {
      // Reset form
      setSelectedMethodId('');
      setAmount('');
      setReferenceNumber('');
      setNotes('');
      onPaymentReported?.();
      onClose();
    }
    
    setIsSubmitting(false);
  };

  const getMethodIcon = (methodType: string) => {
    switch (methodType) {
      case 'stripe':
        return <CreditCard className="h-4 w-4" />;
      case 'bank_transfer':
        return <Receipt className="h-4 w-4" />;
      case 'digital_wallet':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Reportar Pago
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Método de Pago */}
          <div className="space-y-2">
            <Label htmlFor="payment-method">Método de Pago *</Label>
            <Select value={selectedMethodId} onValueChange={setSelectedMethodId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona método de pago" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.id} value={method.id}>
                    <div className="flex items-center gap-2">
                      {getMethodIcon(method.method_type)}
                      <span>{method.name}</span>
                      {method.description && (
                        <span className="text-xs text-muted-foreground">
                          - {method.description}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Monto */}
          <div className="space-y-2">
            <Label htmlFor="amount">Monto Pagado *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10"
                placeholder="0.00"
                required
              />
            </div>
            {amountNumber !== expectedAmount && (
              <p className="text-xs text-amber-600">
                Monto esperado: ${expectedAmount.toFixed(2)}
              </p>
            )}
          </div>

          {/* Número de Referencia */}
          {selectedMethod?.requires_reference && (
            <div className="space-y-2">
              <Label htmlFor="reference">Número de Referencia *</Label>
              <div className="relative">
                <Receipt className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reference"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="pl-10"
                  placeholder="Número de confirmación/referencia"
                  required={selectedMethod.requires_reference}
                />
              </div>
            </div>
          )}

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Información adicional sobre el pago..."
              rows={3}
            />
          </div>

          {/* Resumen */}
          {selectedMethod && (
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="text-sm font-medium mb-2">Resumen del Pago</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Método:</span>
                  <span>{selectedMethod.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Monto:</span>
                  <span className="font-medium">${amountNumber.toFixed(2)}</span>
                </div>
                {referenceNumber && (
                  <div className="flex justify-between">
                    <span>Referencia:</span>
                    <span className="font-mono text-xs">{referenceNumber}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || isLoading}
              className="flex-1"
            >
              {isSubmitting ? 'Reportando...' : 'Reportar Pago'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};