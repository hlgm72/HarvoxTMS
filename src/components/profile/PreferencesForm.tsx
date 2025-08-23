import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFleetNotifications } from '@/components/notifications';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { supabase } from '@/integrations/supabase/client';
import { Save, RotateCcw, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OnboardingActions } from './OnboardingActions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const preferencesSchema = z.object({
  preferred_language: z.string().optional(),
  timezone: z.string().optional(),
});

type PreferencesFormData = z.infer<typeof preferencesSchema>;

interface PreferencesFormProps {
  onCancel?: () => void;
  showCancelButton?: boolean;
  className?: string;
  showOnboardingSection?: boolean;
}

export interface PreferencesFormRef {
  saveData: () => Promise<{ success: boolean; error?: string }>;
}

export const PreferencesForm = forwardRef<PreferencesFormRef, PreferencesFormProps>(({ onCancel, showCancelButton = true, className, showOnboardingSection = false }, ref) => {
  const { t, i18n } = useTranslation('settings');
  const { showSuccess, showError } = useFleetNotifications();
  const { user } = useUserProfile();
  const { preferences, updatePreferences } = useUserPreferences();
  const [updating, setUpdating] = useState(false);

  const preferencesForm = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      preferred_language: 'en',
      timezone: 'America/New_York',
    },
  });

  useEffect(() => {
    if (preferences) {
      preferencesForm.reset({
        preferred_language: preferences.preferred_language || 'en',
        timezone: preferences.timezone || 'America/New_York',
      });
    }
  }, [preferences, preferencesForm]);

  const savePreferencesData = async (data: PreferencesFormData): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: t('profile.personal_info.user_not_found') };

    try {
      const result = await updatePreferences({
        preferred_language: data.preferred_language || 'en',
        timezone: data.timezone || 'America/New_York',
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Update i18n language if changed
      if (data.preferred_language && data.preferred_language !== i18n.language) {
        await i18n.changeLanguage(data.preferred_language);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || t('profile.personal_info.unknown_error') };
    }
  };

  const onSubmitPreferences = async (data: PreferencesFormData) => {
    setUpdating(true);
    try {
      const result = await savePreferencesData(data);
      if (result.success) {
        showSuccess(
          t('profile.preferences.success_title'),
          t('profile.preferences.success_message')
        );
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      showError(
        t('profile.preferences.error_title'),
        error.message || t('profile.preferences.error_message')
      );
    } finally {
      setUpdating(false);
    }
  };

  // Expose saveData method via ref
  useImperativeHandle(ref, () => ({
    saveData: async () => {
      const data = preferencesForm.getValues();
      return await savePreferencesData(data);
    }
  }));

  const handleCancel = () => {
    if (preferences) {
      preferencesForm.reset({
        preferred_language: preferences.preferred_language || 'en',
        timezone: preferences.timezone || 'America/New_York',
      });
    }
    onCancel?.();
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t('profile.preferences.title')}</CardTitle>
        <CardDescription>
          {t('profile.preferences.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...preferencesForm}>
          <form onSubmit={preferencesForm.handleSubmit(onSubmitPreferences)} className="space-y-4" data-form="preferences">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={preferencesForm.control}
                name="preferred_language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">{t('profile.preferences.preferred_language')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('profile.preferences.language_placeholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="en">{t('profile.preferences.english')}</SelectItem>
                        <SelectItem value="es">{t('profile.preferences.spanish')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={preferencesForm.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">{t('profile.preferences.timezone')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('profile.preferences.timezone_placeholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="America/New_York">{t('profile.preferences.timezones.eastern')}</SelectItem>
                        <SelectItem value="America/Chicago">{t('profile.preferences.timezones.central')}</SelectItem>
                        <SelectItem value="America/Denver">{t('profile.preferences.timezones.mountain')}</SelectItem>
                        <SelectItem value="America/Los_Angeles">{t('profile.preferences.timezones.pacific')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {showCancelButton && (
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t('profile.preferences.cancel')}
                </Button>
                <Button type="submit" disabled={updating} className="w-full sm:w-auto">
                  <Save className="mr-2 h-4 w-4" />
                  {updating ? t('profile.preferences.saving') : t('profile.preferences.save')}
                </Button>
              </div>
            )}
          </form>
        </Form>

        {showOnboardingSection && (
          <div className="border-t pt-6">
            <div className="mb-4">
              <h4 className="text-base font-medium flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {t('onboarding.title')}
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                {t('onboarding.description')}
              </p>
            </div>
            <OnboardingActions />
          </div>
        )}
      </CardContent>
    </Card>
  );
});