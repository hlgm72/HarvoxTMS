import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { formatDateInUserTimeZone, formatMonthName, formatPrettyDate } from '@/lib/dateFormatting';
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
import { useQueryClient } from "@tanstack/react-query";

interface InviteDriverDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function InviteDriverDialog({ isOpen, onClose, onSuccess }: InviteDriverDialogProps) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();
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
        t("users:driver_invite_dialog.validation.validation_error"),
        t("users:driver_invite_dialog.validation.complete_all_fields")
      );
      return;
    }

    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        throw new Error(t("users:driver_invite_dialog.validation.session_expired"));
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
        throw new Error(t("users:driver_invite_dialog.errors.connection_error"));
      }

      // Check if the function returned an error response
      if (data && !data.success) {
        throw new Error(data.error || t("users:driver_invite_dialog.errors.send_error"));
      }

      showSuccess(
        t("users:driver_invite_dialog.success.invitation_sent"),
        `${t("users:driver_invite_dialog.success.invitation_sent_to")} ${formData.email}`
      );

      // Invalidar queries relacionadas para actualizar contadores y listas
      await queryClient.invalidateQueries({
        queryKey: ['drivers-count']
      });
      await queryClient.invalidateQueries({
        queryKey: ['consolidated-drivers']
      });
      await queryClient.invalidateQueries({
        queryKey: ['user-invitations']
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
      
      const errorMessage = error.message || t("users:driver_invite_dialog.errors.general_error");
      showError(t("common:error"), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-white border-border">
        <DialogHeader>
          <DialogTitle>{t("users:driver_invite_dialog.title")}</DialogTitle>
          <DialogDescription>
            {t("users:driver_invite_dialog.description")}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label htmlFor="firstName">{t("users:driver_invite_dialog.form.first_name")} *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder={t("users:driver_invite_dialog.form.first_name_placeholder")}
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="lastName">{t("users:driver_invite_dialog.form.last_name")} *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder={t("users:driver_invite_dialog.form.last_name_placeholder")}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="email">{t("users:driver_invite_dialog.form.email")} *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder={t("users:driver_invite_dialog.form.email_placeholder")}
            />
          </div>

          <div className="space-y-3">
            <Label>{t("users:driver_invite_dialog.form.hire_date")} *</Label>
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
                  {formData.hireDate ? formatPrettyDate(formData.hireDate) : <span>{t("users:driver_invite_dialog.form.select_date")}</span>}
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
                             {formatMonthName(new Date(2024, i, 1))}
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
                        placeholder={t("common:year")}
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
              {t("users:driver_invite_dialog.buttons.cancel")}
            </Button>
            <Button type="submit" disabled={loading || !isFormValid}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("users:driver_invite_dialog.buttons.send_invitation")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}