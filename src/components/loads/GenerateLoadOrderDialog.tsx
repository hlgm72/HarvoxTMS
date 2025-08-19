import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useATMInput } from "@/hooks/useATMInput";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, AlertTriangle } from "lucide-react";
import { useFleetNotifications } from "@/components/notifications";
import { generateLoadOrderPDF } from "@/lib/loadOrderPDF";

const loadOrderSchema = z.object({
  customAmount: z.number().min(0.01, "El monto debe ser mayor a 0"),
});

interface GenerateLoadOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  loadData: {
    load_number: string;
    total_amount: number;
    commodity: string;
    weight_lbs?: number;
    client_name?: string;
    driver_name?: string;
    loadStops: any[];
    company_name?: string;
    company_phone?: string;
    company_email?: string;
  };
  onLoadOrderGenerated: (loadOrderData: { blob: Blob; amount: number }) => void;
}

export function GenerateLoadOrderDialog({ 
  isOpen, 
  onClose, 
  loadData, 
  onLoadOrderGenerated 
}: GenerateLoadOrderDialogProps) {
  const { t } = useTranslation('loads');
  const [isGenerating, setIsGenerating] = useState(false);
  const { showSuccess, showError } = useFleetNotifications();
  
  console.log('🔍 GenerateLoadOrderDialog - Rendering with props:', { isOpen, loadData });
  
  // Watch for changes in isOpen
  useEffect(() => {
    console.log('🔍 GenerateLoadOrderDialog - isOpen changed to:', isOpen);
  }, [isOpen]);
  
  const form = useForm<z.infer<typeof loadOrderSchema>>({
    resolver: zodResolver(loadOrderSchema),
    defaultValues: {
      customAmount: loadData.total_amount,
    },
  });

  // Update form when loadData changes
  useEffect(() => {
    if (loadData.total_amount) {
      form.setValue("customAmount", loadData.total_amount);
    }
  }, [loadData.total_amount, form]);

  const atmInput = useATMInput({
    initialValue: loadData.total_amount,
    onValueChange: (value) => {
      form.setValue("customAmount", value);
    }
  });

  const onSubmit = async (values: z.infer<typeof loadOrderSchema>) => {
    // Validar que el monto no sea mayor al original
    if (values.customAmount > loadData.total_amount) {
      form.setError("customAmount", {
        type: "manual",
        message: `El monto no puede ser mayor al original ($${loadData.total_amount.toFixed(2)})`
      });
      return;
    }

    setIsGenerating(true);
    console.log('🔄 GenerateLoadOrderDialog - Starting PDF generation...');
    
    try {
      // Generar el PDF del Load Order
      console.log('📄 GenerateLoadOrderDialog - Calling generateLoadOrderPDF with data:', {
        ...loadData,
        customAmount: values.customAmount
      });
      
      const pdfBlob = await generateLoadOrderPDF({
        ...loadData,
        customAmount: values.customAmount
      });

      console.log('✅ GenerateLoadOrderDialog - PDF generated successfully');

      // Notificar que se generó el Load Order
      console.log('📢 GenerateLoadOrderDialog - Calling onLoadOrderGenerated...');
      onLoadOrderGenerated({
        blob: pdfBlob,
        amount: values.customAmount
      });

      console.log('🎉 GenerateLoadOrderDialog - Load Order generated successfully');
      showSuccess(
        "Load Order generado",
        `Load Order creado exitosamente con monto $${values.customAmount.toFixed(2)}`
      );

      console.log('🚪 GenerateLoadOrderDialog - Closing modal...');
      onClose();
    } catch (error) {
      console.error('❌ GenerateLoadOrderDialog - Error generating Load Order:', error);
      showError(
        "Error",
        "No se pudo generar el Load Order. Intenta nuevamente."
      );
    } finally {
      console.log('🏁 GenerateLoadOrderDialog - Finishing, setting isGenerating to false');
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('generate_load_order.title')}
          </DialogTitle>
          <DialogDescription>
            {t('generate_load_order.description')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Load Info Summary */}
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Carga:</span>
                    <span className="font-medium">{loadData.load_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monto original:</span>
                    <span className="font-medium">${loadData.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Commodity:</span>
                    <span className="font-medium">{loadData.commodity}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Custom Amount Input */}
            <FormField
              control={form.control}
              name="customAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto para el Load Order ($) *</FormLabel>
                  <FormControl>
                    <Input 
                      type="text"
                      value={atmInput.displayValue}
                      onKeyDown={atmInput.handleKeyDown}
                      onPaste={atmInput.handlePaste}
                      placeholder="$0.00"
                      className="text-right font-mono"
                      autoComplete="off"
                      readOnly
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Importante:</p>
                <p className="text-amber-700">
                  El conductor verá este Load Order en lugar del Rate Confirmation original. 
                  El monto debe ser menor o igual al monto original.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isGenerating}>
                {isGenerating ? "Generando..." : "Generar Load Order"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}