import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useFleetNotifications } from '@/components/notifications';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Save, RotateCcw, Truck } from 'lucide-react';
import { BirthDateInput } from '@/components/ui/BirthDateInput';
import { createTextHandlers } from '@/lib/textUtils';
import { LicenseInfoSection } from '@/components/drivers/LicenseInfoSection';

const driverInfoSchema = z.object({
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
});

type DriverInfoFormData = z.infer<typeof driverInfoSchema>;

interface DriverInfoFormProps {
  onCancel?: () => void;
  showCancelButton?: boolean;
  className?: string;
}

export interface DriverInfoFormRef {
  saveData: () => Promise<{ success: boolean; error?: string }>;
}

interface DriverProfile {
  date_of_birth: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  license_number: string | null;
  license_state: string | null;
  license_issue_date: string | null;
  license_expiry_date: string | null;
  cdl_class: string | null;
  cdl_endorsements: string | null;
}

interface LicenseData {
  license_number: string;
  license_state: string;
  license_issue_date: Date | null;
  license_expiry_date: Date | null;
  cdl_class: string;
  cdl_endorsements: string;
}

export const DriverInfoForm = forwardRef<DriverInfoFormRef, DriverInfoFormProps>(({ onCancel, showCancelButton = true, className }, ref) => {
  const { showSuccess, showError } = useFleetNotifications();
  const { user } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [licenseData, setLicenseData] = useState<LicenseData>({
    license_number: '',
    license_state: '',
    license_issue_date: null,
    license_expiry_date: null,
    cdl_class: '',
    cdl_endorsements: '',
  });

  // Create handlers for text inputs
  const phoneHandlers = createTextHandlers((value) => 
    driverInfoForm.setValue('emergency_contact_phone', value), 'phone'
  );

  const driverInfoForm = useForm<DriverInfoFormData>({
    resolver: zodResolver(driverInfoSchema),
    defaultValues: {
      emergency_contact_name: '',
      emergency_contact_phone: '',
    },
  });

  // Helper functions for date conversion (for license dates only now)
  const formatDateForDisplay = (dateString: string | null): string => {
    if (!dateString) return '';
    
    try {
      let year: number, month: number, day: number;
      
      if (dateString.includes('T') || dateString.includes('Z')) {
        const datePart = dateString.split('T')[0];
        [year, month, day] = datePart.split('-').map(Number);
      } else if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        [year, month, day] = dateString.split('-').map(Number);
      } else {
        return dateString;
      }
      
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        return dateString;
      }
      
      // Return in dd/mm/yyyy format for Spanish locale (you can adjust based on i18n)
      return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    } catch (error) {
      console.error('Error formatting date for display:', error);
      return dateString;
    }
  };

  // Fetch driver profile data
  useEffect(() => {
    const fetchDriverProfile = async () => {
      if (!user) return;

      try {
        // Obtener datos específicos del conductor
        const { data, error } = await supabase
          .from('driver_profiles')
          .select('emergency_contact_name, emergency_contact_phone, license_number, license_state, license_issue_date, license_expiry_date, cdl_class, cdl_endorsements')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching driver profile:', error);
          return;
        }

        // Set driver profile state
        const combinedProfile = {
          date_of_birth: null,
          emergency_contact_name: data?.emergency_contact_name || null,
          emergency_contact_phone: data?.emergency_contact_phone || null,
          license_number: data?.license_number || null,
          license_state: data?.license_state || null,
          license_issue_date: data?.license_issue_date || null,
          license_expiry_date: data?.license_expiry_date || null,
          cdl_class: data?.cdl_class || null,
          cdl_endorsements: data?.cdl_endorsements || null
        };

        setDriverProfile(combinedProfile);

        // Update form with profile data
        driverInfoForm.reset({
          emergency_contact_name: data?.emergency_contact_name || '',
          emergency_contact_phone: data?.emergency_contact_phone || '',
        });

        // Update license data separately
        if (data) {
          setLicenseData({
            license_number: data.license_number || '',
            license_state: data.license_state || '',
            license_issue_date: parseDateFromDatabase(data.license_issue_date),
            license_expiry_date: parseDateFromDatabase(data.license_expiry_date),
            cdl_class: data.cdl_class || '',
            cdl_endorsements: data.cdl_endorsements || '',
          });
        }
      } catch (error) {
        console.error('Error fetching driver profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDriverProfile();
  }, [user, driverInfoForm]);

  const saveDriverInfoData = async (data: DriverInfoFormData): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Usuario no encontrado' };

    try {
      // Check if driver profile exists
      const { data: existingProfile } = await supabase
        .from('driver_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const driverUpdateData = {
        user_id: user.id,
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_contact_phone: data.emergency_contact_phone || null,
        license_number: licenseData.license_number || null,
        license_state: licenseData.license_state || null,
        license_issue_date: licenseData.license_issue_date ? formatDateForDatabase(licenseData.license_issue_date) : null,
        license_expiry_date: licenseData.license_expiry_date ? formatDateForDatabase(licenseData.license_expiry_date) : null,
        cdl_class: licenseData.cdl_class || null,
        cdl_endorsements: licenseData.cdl_endorsements || null,
        updated_at: new Date().toISOString(),
      };

      let error;

      if (existingProfile) {
        // Update existing profile
        ({ error } = await supabase
          .from('driver_profiles')
          .update(driverUpdateData)
          .eq('user_id', user.id));
      } else {
        // Create new profile
        ({ error } = await supabase
          .from('driver_profiles')
          .insert({
            ...driverUpdateData,
            is_active: true,
          }));
      }

      if (error) {
        console.error('Error saving driver info:', error);
        return { success: false, error: error.message };
      }

      // Update local state
      setDriverProfile({
        date_of_birth: null,
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_contact_phone: data.emergency_contact_phone || null,
        license_number: licenseData.license_number || null,
        license_state: licenseData.license_state || null,
        license_issue_date: licenseData.license_issue_date ? formatDateForDatabase(licenseData.license_issue_date) : null,
        license_expiry_date: licenseData.license_expiry_date ? formatDateForDatabase(licenseData.license_expiry_date) : null,
        cdl_class: licenseData.cdl_class || null,
        cdl_endorsements: licenseData.cdl_endorsements || null,
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error desconocido' };
    }
  };

  const onSubmitDriverInfo = async (data: DriverInfoFormData) => {
    setUpdating(true);
    try {
      const result = await saveDriverInfoData(data);
      if (result.success) {
        showSuccess(
          "Información de conductor actualizada",
          "Sus datos personales han sido guardados correctamente."
        );
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      showError(
        "Error en la actualización",
        error.message || "No se ha podido completar la actualización. Por favor, inténtelo nuevamente."
      );
    } finally {
      setUpdating(false);
    }
  };

  // Expose saveData method via ref
  useImperativeHandle(ref, () => ({
    saveData: async () => {
      const data = driverInfoForm.getValues();
      return await saveDriverInfoData(data);
    }
  }));

  const handleCancel = () => {
    if (driverProfile) {
      driverInfoForm.reset({
        emergency_contact_name: driverProfile.emergency_contact_name || '',
        emergency_contact_phone: driverProfile.emergency_contact_phone || '',
      });
      
      setLicenseData({
        license_number: driverProfile.license_number || '',
        license_state: driverProfile.license_state || '',
        license_issue_date: parseDateFromDatabase(driverProfile.license_issue_date),
        license_expiry_date: parseDateFromDatabase(driverProfile.license_expiry_date),
        cdl_class: driverProfile.cdl_class || '',
        cdl_endorsements: driverProfile.cdl_endorsements || '',
      });
    }
    onCancel?.();
  };

  const handleLicenseUpdate = (field: keyof LicenseData, value: any) => {
    setLicenseData(prev => ({ ...prev, [field]: value }));
  };

  const parseDateFromDatabase = (dateString: string | null | undefined): Date | null => {
    if (!dateString) return null;
    
    try {
      let year: number, month: number, day: number;
      
      if (dateString.includes('T') || dateString.includes('Z')) {
        const datePart = dateString.split('T')[0];
        [year, month, day] = datePart.split('-').map(Number);
      } else if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        [year, month, day] = dateString.split('-').map(Number);
      } else {
        return null;
      }
      
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        return null;
      }
      
      return new Date(year, month - 1, day);
    } catch (error) {
      console.error('Error parsing date from database:', error);
      return null;
    }
  };

  const formatDateForDatabase = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Form {...driverInfoForm}>
        <form onSubmit={driverInfoForm.handleSubmit(onSubmitDriverInfo)} className="space-y-4">
          <LicenseInfoSection
            data={licenseData}
            onUpdate={handleLicenseUpdate}
            loading={updating}
          />

          <div className="space-y-4 border-t pt-4">
            <h4 className="text-sm font-medium text-muted-foreground">Contacto de Emergencia</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={driverInfoForm.control}
                name="emergency_contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Nombre del Contacto</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Nombre completo del contacto de emergencia" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={driverInfoForm.control}
                name="emergency_contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Teléfono del Contacto</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="(555) 123-4567"
                        value={field.value || ''} 
                        {...phoneHandlers}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
            {showCancelButton && (
              <Button type="button" variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
                <RotateCcw className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={updating} className="w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" />
              {updating ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
});