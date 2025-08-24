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

const createPasswordSchema = (t: any) => z.object({
  currentPassword: z.string().min(1, t('profile.security.validation.current_required')),
  newPassword: z.string().min(6, t('profile.security.validation.new_min_length')),
  confirmPassword: z.string().min(1, t('profile.security.validation.confirm_required')),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: t('profile.security.validation.no_match'),
  path: ["confirmPassword"],
});

type PasswordFormData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

interface SecurityFormProps {
  onCancel?: () => void;
  showCancelButton?: boolean;
  className?: string;
}

export function SecurityForm({ onCancel, showCancelButton = true, className }: SecurityFormProps) {
  const { t } = useTranslation('settings');
  const { showSuccess, showError } = useFleetNotifications();
  const { user } = useUserProfile();
  const [changingPassword, setChangingPassword] = useState(false);

  // Create schema with translations
  const passwordSchema = createPasswordSchema(t);

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
        throw new Error(t('profile.security.current_incorrect'));
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (updateError) throw updateError;

      showSuccess(
        t('profile.security.success_title'),
        t('profile.security.success_message')
      );

      passwordForm.reset();
    } catch (error: any) {
      showError(
        t('profile.security.error_title'),
        error.message || t('profile.security.error_message')
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
        <h3 className="text-base md:text-lg font-medium">{t('profile.security.title')}</h3>
        <p className="text-xs md:text-sm text-muted-foreground">
          {t('profile.security.description')}
        </p>
      </div>

      <Form {...passwordForm}>
        <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4 max-w-md">
          <FormField
            control={passwordForm.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">{t('profile.security.current_password')}</FormLabel>
                <FormControl>
                  <Input type="password" placeholder={t('profile.security.current_password_placeholder')} {...field} />
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
                <FormLabel className="text-sm font-medium">{t('profile.security.new_password')}</FormLabel>
                <FormControl>
                  <Input type="password" placeholder={t('profile.security.new_password_placeholder')} {...field} />
                </FormControl>
                <FormDescription className="text-xs">
                  {t('profile.security.new_password_description')}
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
                <FormLabel className="text-sm font-medium">{t('profile.security.confirm_password')}</FormLabel>
                <FormControl>
                  <Input type="password" placeholder={t('profile.security.confirm_password_placeholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col sm:flex-row justify-start gap-2">
            {showCancelButton && (
              <Button type="button" variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
                <RotateCcw className="mr-2 h-4 w-4" />
                {t('profile.security.cancel')}
              </Button>
            )}
            <Button type="submit" disabled={changingPassword} variant="default" className="w-full sm:w-auto">
              {changingPassword ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  {t('profile.security.changing')}
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  {t('profile.security.change_password')}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}