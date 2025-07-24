import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Settings, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  useCompanyPaymentConfig, 
  PaymentConfig, 
  PAYMENT_FREQUENCY_OPTIONS, 
  WEEKDAY_OPTIONS 
} from '@/hooks/useCompanyPaymentConfig';
import { Separator } from '@/components/ui/separator';

interface PaymentConfigurationFormProps {
  companyId: string;
}

export const PaymentConfigurationForm = ({ companyId }: PaymentConfigurationFormProps) => {
  const { config, isLoading, updateConfig, isUpdating, generatePreviewPeriods } = useCompanyPaymentConfig(companyId);
  
  const [formData, setFormData] = useState<PaymentConfig>({
    default_payment_frequency: 'weekly',
    payment_cycle_start_day: 1,
  });

  const [showPreview, setShowPreview] = useState(false);

  // Update form when config loads
  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      ...formData,
      company_id: companyId,
    });
  };

  const previewPeriods = generatePreviewPeriods(formData, new Date());

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración de Períodos de Pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración de Períodos de Pago
          </CardTitle>
          <CardDescription>
            Define la frecuencia y el día de inicio para los períodos de pago de conductores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Payment Frequency */}
            <div className="space-y-2">
              <Label htmlFor="frequency">Frecuencia de Pago</Label>
              <Select 
                value={formData.default_payment_frequency} 
                onValueChange={(value: any) => setFormData(prev => ({ 
                  ...prev, 
                  default_payment_frequency: value 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona la frecuencia" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_FREQUENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                La frecuencia determina cada cuánto tiempo se generan los períodos de pago
              </p>
            </div>

            {/* Start Day */}
            <div className="space-y-2">
              <Label htmlFor="startDay">Día de Inicio del Ciclo</Label>
              <Select 
                value={formData.payment_cycle_start_day.toString()} 
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  payment_cycle_start_day: parseInt(value) 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el día" />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                El día de la semana en que inician los períodos de pago
              </p>
            </div>

            <Separator />

            {/* Preview Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Vista Previa de Períodos</h4>
                <p className="text-sm text-muted-foreground">
                  Ve cómo se verán los próximos períodos con esta configuración
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {showPreview ? 'Ocultar' : 'Mostrar'} Vista Previa
              </Button>
            </div>

            {/* Preview Periods */}
            {showPreview && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <h5 className="font-medium flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Próximos Períodos de Pago
                </h5>
                <div className="grid gap-2">
                  {previewPeriods.map((period, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-background rounded border">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">
                          Período {index + 1}
                        </Badge>
                        <span className="text-sm">
                          {format(period.start, 'dd/MM/yyyy', { locale: es })} - {format(period.end, 'dd/MM/yyyy', { locale: es })}
                        </span>
                      </div>
                      <Badge variant="secondary">
                        {formData.default_payment_frequency === 'weekly' && '7 días'}
                        {formData.default_payment_frequency === 'biweekly' && '14 días'}
                        {formData.default_payment_frequency === 'monthly' && 'Mensual'}
                      </Badge>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  * Esta vista previa muestra cómo se generarían los períodos con la configuración actual
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isUpdating}
                className="min-w-[120px]"
              >
                {isUpdating ? 'Guardando...' : 'Guardar Configuración'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};