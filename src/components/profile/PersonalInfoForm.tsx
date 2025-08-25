import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AddressForm } from '@/components/ui/AddressForm';
import { useFleetNotifications } from '@/components/notifications';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Save, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createTextHandlers } from '@/lib/textUtils';
import { BirthDateInput } from '@/components/ui/BirthDateInput';

const createPersonalInfoSchema = (t: any) => z.object({
  first_name: z.string().min(1, t('profile.personal_info.validation.first_name_required')),
  last_name: z.string().min(1, t('profile.personal_info.validation.last_name_required')),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  street_address: z.string().optional(),
  state_id: z.string().optional(),
  city: z.string().optional(),
  zip_code: z.string().optional(),
});

type PersonalInfoFormData = {
  first_name: string;
  last_name: string;
  phone?: string;
  date_of_birth?: string;
  street_address?: string;
  state_id?: string;
  city?: string;
  zip_code?: string;
};

interface PersonalInfoFormProps {
  onCancel?: () => void;
  showCancelButton?: boolean;
  showSaveButton?: boolean;
  className?: string;
}

export interface PersonalInfoFormRef {
  saveData: () => Promise<{ success: boolean; error?: string }>;
}

export const PersonalInfoForm = forwardRef<PersonalInfoFormRef, PersonalInfoFormProps>(({ onCancel, showCancelButton = true, showSaveButton = true, className }, ref) => {
  const { t, i18n } = useTranslation('settings');
  const { showSuccess, showError } = useFleetNotifications();
  const { profile, user, refreshProfile } = useUserProfile();
  const { refreshRoles } = useAuth();
  const [updating, setUpdating] = useState(false);

  // Create schema with translations
  const personalInfoSchema = createPersonalInfoSchema(t);

  // Create handlers for text inputs
  const nameHandlers = createTextHandlers((value) => 
    personalInfoForm.setValue('first_name', value)
  );
  
  const lastNameHandlers = createTextHandlers((value) => 
    personalInfoForm.setValue('last_name', value)
  );
  
  const phoneHandlers = createTextHandlers((value) => 
    personalInfoForm.setValue('phone', value), 'phone'
  );

  // Helper function to convert database date format to display format
  const formatDateForDisplay = (dateString: string | null): string => {
    if (!dateString) return '';
    try {
      // Expect yyyy-mm-dd from database
      const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (match) {
        const [, year, month, day] = match;
        // Locale-aware display
        if (i18n.language === 'es') {
          // DD/MM/YYYY
          return `${day}/${month}/${year}`;
        } else {
          // MM/DD/YYYY
          return `${month}/${day}/${year}`;
        }
      }
      return dateString;
    } catch (error) {
      console.error('Error formatting date for display:', error);
      return '';
    }
  };

  // Helper function to convert display format to database format
  const formatDateForDatabase = (displayDate: string): string | null => {
    if (!displayDate || displayDate.trim() === '') return null;
    try {
      let day: string | undefined;
      let month: string | undefined;
      let year: string | undefined;

      // Match either d/m/yyyy or m/d/yyyy with 1-2 digit day/month
      const parts = displayDate.split('/');
      if (parts.length !== 3) return null;

      if (i18n.language === 'es') {
        // DD/MM/YYYY
        [day, month, year] = parts;
      } else {
        // MM/DD/YYYY
        [month, day, year] = parts;
      }

      // Normalize
      const dd = day!.padStart(2, '0');
      const mm = month!.padStart(2, '0');
      const yyyy = year!;

      // Basic range checks to avoid invalid months/days
      const mNum = parseInt(mm, 10);
      const dNum = parseInt(dd, 10);
      const yNum = parseInt(yyyy, 10);
      if (isNaN(mNum) || isNaN(dNum) || isNaN(yNum)) return null;
      if (mNum < 1 || mNum > 12) return null;
      if (dNum < 1 || dNum > 31) return null;

      // Return ISO for DB
      return `${yyyy}-${mm}-${dd}`;
    } catch (error) {
      console.error('Error converting date to database format:', error);
      return null;
    }
  };

  const personalInfoForm = useForm<PersonalInfoFormData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      date_of_birth: '',
      street_address: '',
      state_id: '',
      city: '',
      zip_code: '',
    },
  });

  useEffect(() => {
    if (profile) {
      personalInfoForm.reset({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        date_of_birth: formatDateForDisplay(profile.date_of_birth),
        street_address: profile.street_address || '',
        state_id: profile.state_id || '',
        city: profile?.city || '',
        zip_code: profile.zip_code || '',
      });
    }
  }, [profile, personalInfoForm]);

  const savePersonalInfoData = async (data: PersonalInfoFormData): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: t('profile.personal_info.user_not_found') };

    try {
      // Check if this is the user's first time completing their profile
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const isFirstTime = !existingProfile;

      // Save profile data
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone || null,
          date_of_birth: formatDateForDatabase(data.date_of_birth),
          street_address: data.street_address || null,
          state_id: data.state_id || null,
          city: data.city || null,
          zip_code: data.zip_code || null,
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving profile:', error);
        return { success: false, error: error.message };
      }

      // If first time and user doesn't have any company roles, create a default company
      if (isFirstTime) {
        console.log('🏢 First time profile completion - checking for existing roles...');
        
        const { data: userRoles } = await supabase
          .from('user_company_roles')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (!userRoles || userRoles.length === 0) {
          console.log('🏢 No existing roles found - creating default company...');
          
          // Create a default company for the user
          const companyName = `${data.first_name} ${data.last_name} Transportation`;
          
          const { data: companyResult, error: companyError } = await supabase.rpc(
            'create_or_update_company_with_validation',
            {
              company_data: {
                name: companyName,
                street_address: data.street_address || 'Address not provided',
                state_id: data.state_id || 'TX',
                zip_code: data.zip_code || '00000',
                city_id: null,
                plan_type: 'basic',
                status: 'active'
              }
            }
          );

          if (companyError) {
            console.error('Error creating default company:', companyError);
            // Don't fail the profile save if company creation fails
          } else {
            console.log('🎉 Default company created successfully:', companyResult);
            showSuccess(
              t('profile.personal_info.company_created_title'),
              t('profile.personal_info.company_created_message', { companyName })
            );
            
            // Refresh user roles to update the auth context
            await refreshRoles();
          }
        }
      }

      await refreshProfile();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || t('profile.personal_info.unknown_error') };
    }
  };

  const onSubmitPersonalInfo = async (data: PersonalInfoFormData) => {
    setUpdating(true);
    try {
      const result = await savePersonalInfoData(data);
      if (result.success) {
        showSuccess(
          t('profile.personal_info.success_title'),
          t('profile.personal_info.success_message')
        );
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      showError(
        t('profile.personal_info.error_title'),
        error.message || t('profile.personal_info.error_message')
      );
    } finally {
      setUpdating(false);
    }
  };

  // Expose saveData method via ref
  useImperativeHandle(ref, () => ({
    saveData: async () => {
      // Trigger validation to ensure all field values are current
      const isValid = await personalInfoForm.trigger();
      if (!isValid) {
        return { success: false, error: 'Form validation failed' };
      }
      
      // Get current form values (this includes any user changes)
      const data = personalInfoForm.getValues();
      console.log('🔄 Saving personal info data:', data);
      return await savePersonalInfoData(data);
    }
  }));

  const handleCancel = () => {
    if (profile) {
      personalInfoForm.reset({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        date_of_birth: formatDateForDisplay(profile.date_of_birth),
        street_address: profile.street_address || '',
        state_id: profile.state_id || '',
        city: profile?.city || '',
        zip_code: profile.zip_code || '',
      });
    }
    onCancel?.();
  };

  return (
    <div className={className}>
      <div className="mb-4">
        <h3 className="text-base md:text-lg font-medium">{t('profile.personal_info.title')}</h3>
        <p className="text-xs md:text-sm text-muted-foreground">
          {t('profile.personal_info.description')}
        </p>
      </div>
      
      <Form {...personalInfoForm}>
        <form onSubmit={personalInfoForm.handleSubmit(onSubmitPersonalInfo)} className="space-y-4" data-form="personal-info">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={personalInfoForm.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">{t('profile.personal_info.first_name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('profile.personal_info.first_name_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={personalInfoForm.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">{t('profile.personal_info.last_name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('profile.personal_info.last_name_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={personalInfoForm.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">{t('profile.personal_info.phone')}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={t('profile.personal_info.phone_placeholder')} 
                      value={field.value || ''} 
                      {...phoneHandlers}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={personalInfoForm.control}
              name="date_of_birth"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <BirthDateInput 
                      value={field.value || ''}
                      onValueChange={(value) => field.onChange(value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <AddressForm
            streetAddress={personalInfoForm.watch('street_address') || ''}
            onStreetAddressChange={(value) => personalInfoForm.setValue('street_address', value)}
            stateId={personalInfoForm.watch('state_id') || undefined}
            onStateChange={(value) => personalInfoForm.setValue('state_id', value || '')}
            city={personalInfoForm.watch('city') || undefined}
            onCityChange={(value) => personalInfoForm.setValue('city', value || '')}
            zipCode={personalInfoForm.watch('zip_code') || ''}
            onZipCodeChange={(value) => personalInfoForm.setValue('zip_code', value)}
            required={false}
          />

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
            {showCancelButton && (
              <Button type="button" variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
                <RotateCcw className="mr-2 h-4 w-4" />
                {t('profile.personal_info.cancel')}
              </Button>
            )}
            {showSaveButton && (
              <Button type="submit" disabled={updating} className="w-full sm:w-auto">
                <Save className="mr-2 h-4 w-4" />
                {updating ? t('profile.personal_info.saving') : t('profile.personal_info.save')}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
});