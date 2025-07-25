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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface InviteDriverDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function InviteDriverDialog({ isOpen, onClose, onSuccess }: InviteDriverDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
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
      toast({
        title: "Error de validación",
        description: "Por favor complete todos los campos correctamente",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-driver-invitation', {
        body: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          hireDate: formData.hireDate.toISOString().split('T')[0]
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Error al enviar invitación');
      }

      toast({
        title: "Invitación enviada",
        description: "Se ha enviado la invitación al conductor por email.",
      });

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
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar la invitación",
        variant: "destructive",
      });
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
                <Calendar
                  mode="single"
                  selected={formData.hireDate}
                  onSelect={(date) => {
                    if (date) {
                      setFormData(prev => ({ ...prev, hireDate: date }));
                      setIsDateOpen(false);
                    }
                  }}
                  initialFocus
                  className="pointer-events-auto"
                  captionLayout="dropdown"
                  fromYear={1980}
                  toYear={2030}
                />
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