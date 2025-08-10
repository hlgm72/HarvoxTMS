import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { formatDateInUserTimeZone } from '@/lib/dateFormatting';
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
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      }
      const { data, error } = await supabase.functions.invoke('send-driver-invitation', {
        body: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          hireDate: formatDateInUserTimeZone(formData.hireDate)
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      // Handle Supabase function errors (network/connection issues)
      if (error) {
        throw new Error('Error de conexión al enviar invitación');
      }

      // Check if the function returned an error response
      if (data && !data.success) {
        throw new Error(data.error || 'Error al enviar invitación');
      }

      showSuccess(
        "Invitación enviada",
        `Se ha enviado la invitación al conductor a ${formData.email}`
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
      
      const errorMessage = error.message || "No se pudo enviar la invitación";
      showError("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-white border-border">
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
            <Label>Fecha de contratación *</Label>
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
                        // Close the popover immediately after selection
                        setTimeout(() => setIsDateOpen(false), 0);
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