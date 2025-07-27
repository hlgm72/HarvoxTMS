import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useFleetNotifications } from '@/components/notifications';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { Save, RotateCcw, KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
  newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirma la nueva contraseña'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

interface SecurityFormProps {
  onCancel?: () => void;
  showCancelButton?: boolean;
  className?: string;
}

export function SecurityForm({ onCancel, showCancelButton = true, className }: SecurityFormProps) {
  const { t } = useTranslation(['common']);
  const { showSuccess, showError } = useFleetNotifications();
  const { user } = useUserProfile();
  const [changingPassword, setChangingPassword] = useState(false);

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmitPassword = async (data: PasswordFormData) => {
    setChangingPassword(true);
    try {
      // First verify current password by trying to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: data.currentPassword,
      });

      if (signInError) {
        throw new Error('La contraseña actual ingresada es incorrecta. Por favor, verifíquela.');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (updateError) throw updateError;

      showSuccess(
        "Contraseña actualizada exitosamente",
        "Su contraseña ha sido modificada de manera segura."
      );

      passwordForm.reset();
    } catch (error: any) {
      showError(
        "Error al cambiar contraseña",
        error.message || "No se ha podido completar el cambio de contraseña. Por favor, verifique la información e inténtelo nuevamente."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCancel = () => {
    passwordForm.reset({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    onCancel?.();
  };

  return (
    <div className={className}>
      <div className="mb-4">
        <h3 className="text-base md:text-lg font-medium">Seguridad de la Cuenta</h3>
        <p className="text-xs md:text-sm text-muted-foreground">
          Actualiza tu contraseña para mantener tu cuenta segura
        </p>
      </div>

      <Form {...passwordForm}>
        <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4 max-w-md">
          <FormField
            control={passwordForm.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Contraseña Actual</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Tu contraseña actual" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={passwordForm.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Nueva Contraseña</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Nueva contraseña" {...field} />
                </FormControl>
                <FormDescription className="text-xs">
                  Debe tener al menos 6 caracteres
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={passwordForm.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Confirmar Nueva Contraseña</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Confirma la nueva contraseña" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col sm:flex-row justify-start gap-2">
            {showCancelButton && (
              <Button type="button" variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
                <RotateCcw className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={changingPassword} variant="secondary" className="w-full sm:w-auto">
              {changingPassword ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Cambiando...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Cambiar Contraseña
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}