import { useState } from 'react';
import { handleTextBlur } from '@/lib/textUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { useFleetNotifications } from '@/components/notifications';
import { 
  Plus, 
  CreditCard, 
  Receipt, 
  DollarSign, 
  FileText, 
  Building, 
  Smartphone,
  Globe
} from 'lucide-react';

interface PaymentMethodManagerProps {
  companyId: string;
}

export const PaymentMethodManager = ({ companyId }: PaymentMethodManagerProps) => {
  const [isAddingMethod, setIsAddingMethod] = useState(false);
  const [newMethod, setNewMethod] = useState({
    name: '',
    methodType: 'manual',
    description: '',
    requiresReference: true
  });

  const { paymentMethods, createPaymentMethod, fetchPaymentMethods, isLoading } = usePaymentMethods();
  const { showError } = useFleetNotifications();

  const methodTypeOptions = [
    { value: 'manual', label: 'Manual', icon: FileText },
    { value: 'bank_transfer', label: 'Transferencia Bancaria', icon: Building },
    { value: 'digital_wallet', label: 'Billetera Digital', icon: Smartphone },
    { value: 'stripe', label: 'Stripe', icon: CreditCard },
    { value: 'other', label: 'Otro', icon: Globe }
  ];

  const getMethodIcon = (methodType: string) => {
    const option = methodTypeOptions.find(opt => opt.value === methodType);
    const IconComponent = option?.icon || FileText;
    return <IconComponent className="h-4 w-4" />;
  };

  const getMethodTypeLabel = (methodType: string) => {
    const option = methodTypeOptions.find(opt => opt.value === methodType);
    return option?.label || 'Desconocido';
  };

  const getMethodTypeBadgeVariant = (methodType: string) => {
    switch (methodType) {
      case 'stripe':
        return 'default';
      case 'bank_transfer':
        return 'secondary';
      case 'digital_wallet':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const handleAddMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!handleTextBlur(newMethod.name)) {
      showError("Error", "El nombre del método es requerido");
      return;
    }

    const success = await createPaymentMethod(
      companyId,
      handleTextBlur(newMethod.name),
      newMethod.methodType,
      handleTextBlur(newMethod.description) || undefined,
      newMethod.requiresReference
    );

    if (success) {
      setNewMethod({
        name: '',
        methodType: 'manual',
        description: '',
        requiresReference: true
      });
      setIsAddingMethod(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Métodos de Pago</h3>
          <p className="text-sm text-muted-foreground">
            Configura los métodos de pago disponibles para tu compañía
          </p>
        </div>
        <Button 
          onClick={() => setIsAddingMethod(true)}
          disabled={isAddingMethod}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Agregar Método
        </Button>
      </div>

      {/* Add New Method Form */}
      {isAddingMethod && (
        <Card>
          <CardHeader>
            <CardTitle>Nuevo Método de Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddMethod} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre */}
                <div className="space-y-2">
                  <Label htmlFor="method-name">Nombre del Método *</Label>
                  <Input
                    id="method-name"
                    value={newMethod.name}
                    onChange={(e) => setNewMethod(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ej. Banco Popular, PayPal Business"
                    required
                  />
                </div>

                {/* Tipo */}
                <div className="space-y-2">
                  <Label htmlFor="method-type">Tipo de Método</Label>
                  <Select 
                    value={newMethod.methodType} 
                    onValueChange={(value) => setNewMethod(prev => ({ ...prev, methodType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {methodTypeOptions.map((option) => {
                        const IconComponent = option.icon;
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4" />
                              {option.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="method-description">Descripción (Opcional)</Label>
                <Textarea
                  id="method-description"
                  value={newMethod.description}
                  onChange={(e) => setNewMethod(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción adicional del método de pago..."
                  rows={2}
                />
              </div>

              {/* Requiere Referencia */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="requires-reference"
                  checked={newMethod.requiresReference}
                  onCheckedChange={(checked) => setNewMethod(prev => ({ ...prev, requiresReference: checked }))}
                />
                <Label htmlFor="requires-reference">
                  Requiere número de referencia/confirmación
                </Label>
              </div>

              {/* Botones */}
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddingMethod(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creando...' : 'Crear Método'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Existing Payment Methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paymentMethods.map((method) => (
          <Card key={method.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getMethodIcon(method.method_type)}
                  <CardTitle className="text-base">{method.name}</CardTitle>
                </div>
                <Badge variant={getMethodTypeBadgeVariant(method.method_type)}>
                  {getMethodTypeLabel(method.method_type)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {method.description && (
                <p className="text-sm text-muted-foreground mb-3">
                  {method.description}
                </p>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <Receipt className="h-3 w-3" />
                  <span className={method.requires_reference ? 'text-amber-600' : 'text-muted-foreground'}>
                    {method.requires_reference ? 'Requiere referencia' : 'No requiere referencia'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-xs">
                  <div className={`h-2 w-2 rounded-full ${method.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="text-muted-foreground">
                    {method.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {paymentMethods.length === 0 && !isAddingMethod && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay métodos de pago</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Agrega métodos de pago para que tus conductores puedan reportar sus pagos
            </p>
            <Button onClick={() => setIsAddingMethod(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Primer Método
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
