import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useFleetNotifications } from "@/components/notifications";
import { supabase } from "@/integrations/supabase/client";

interface InviteDriverDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function InviteDriverDialog({ isOpen, onClose, onSuccess }: InviteDriverDialogProps) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useFleetNotifications();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    hireDate: new Date()
  });
  const [isDateOpen, setIsDateOpen] = useState(false);

  // Validación de email
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Verificar si todos los campos están válidos
  const isFormValid = formData.firstName.trim() !== '' && 
                      formData.lastName.trim() !== '' && 
                      formData.email.trim() !== '' && 
                      isValidEmail(formData.email) && 
                      formData.hireDate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación adicional antes de enviar
    if (!isFormValid) {
      showError(
        "Error de validación",
        "Por favor complete todos los campos correctamente"
      );
      return;
    }

    setLoading(true);

    try {
      console.log('Sending driver invitation with data:', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        hireDate: formData.hireDate.toISOString().split('T')[0]
      });

      const { data, error } = await supabase.functions.invoke('send-driver-invitation', {
        body: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          hireDate: formData.hireDate.toISOString().split('T')[0]
        }
      });

      console.log('Function response:', { data, error });

      // Check for edge function errors first
      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      // Check if the function returned an error response
      if (data && !data.success) {
        console.error('Function returned error:', data.error);
        throw new Error(data.error || 'Error al enviar invitación');
      }

      showSuccess(
        "Invitación enviada",
        "Se ha enviado la invitación al conductor por email."
      );

      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        hireDate: new Date()
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error sending driver invitation:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        context: error.context,
        details: error.details
      });
      
      let errorMessage = "No se pudo enviar la invitación";
      
      // For FunctionsHttpError, the actual error response is in a different location
      if (error.name === 'FunctionsHttpError') {
        try {
          // The error response should be available through different paths
          const response = await error.response?.json?.() || error.context?.body;
          console.log('Extracted error response:', response);
          
          if (response && response.error) {
            errorMessage = response.error;
          } else if (typeof response === 'string') {
            try {
              const parsed = JSON.parse(response);
              errorMessage = parsed.error || parsed.message || errorMessage;
            } catch {
              errorMessage = response;
            }
          }
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
          // For 409 conflicts, provide a helpful default message
          if (error.message?.includes('409') || error.context?.status === 409) {
            errorMessage = "Ya existe una invitación pendiente para este email";
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      showError("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invitar Nuevo Conductor</DialogTitle>
          <DialogDescription>
            Envía una invitación por email a un nuevo conductor para que se una a tu empresa.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="Nombre del conductor"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Apellido del conductor"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="conductor@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Fecha de Contratación *</Label>
            <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.hireDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.hireDate ? format(formData.hireDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                </Button>
              </PopoverTrigger>
               <PopoverContent className="w-auto p-0 bg-background border-border">
                <div className="space-y-3 p-4">
                  {/* Month/Year Selectors */}
                  <div className="flex gap-2">
                    <Select
                      value={(formData.hireDate?.getMonth() ?? new Date().getMonth()).toString()}
                      onValueChange={(value) => {
                        const currentDate = formData.hireDate || new Date();
                        const newDate = new Date(currentDate.getFullYear(), parseInt(value), currentDate.getDate());
                        setFormData(prev => ({ ...prev, hireDate: newDate }));
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {format(new Date(2024, i, 1), 'MMMM', { locale: es })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <div className="relative">
                      <Input
                        type="number"
                        min={1980}
                        max={2030}
                        value={formData.hireDate?.getFullYear() ?? new Date().getFullYear()}
                        onChange={(e) => {
                          const year = parseInt(e.target.value);
                          if (year >= 1980 && year <= 2030) {
                            const currentDate = formData.hireDate || new Date();
                            const newDate = new Date(year, currentDate.getMonth(), currentDate.getDate());
                            setFormData(prev => ({ ...prev, hireDate: newDate }));
                          }
                        }}
                        className="w-20 text-center"
                        placeholder="Año"
                      />
                    </div>
                  </div>
                  
                  {/* Calendar */}
                  <Calendar
                    mode="single"
                    selected={formData.hireDate}
                    onSelect={(date) => {
                      if (date) {
                        setFormData(prev => ({ ...prev, hireDate: date }));
                        setIsDateOpen(false);
                      }
                    }}
                    month={formData.hireDate || new Date()}
                    onMonthChange={(date) => setFormData(prev => ({ ...prev, hireDate: date }))}
                    className="p-0 pointer-events-auto"
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !isFormValid}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar Invitación
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}