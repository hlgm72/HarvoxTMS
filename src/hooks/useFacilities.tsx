import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyCache } from './useCompanyCache';
import { useFleetNotifications } from '@/components/notifications';
import { useTranslation } from 'react-i18next';

export interface Facility {
  id: string;
  company_id: string;
  name: string;
  facility_type: 'shipper' | 'receiver' | 'both';
  address: string;
  city: string;
  state: string;
  zip_code: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  created_by: string;
}

// Hook para obtener todas las facilities de la compañía
export const useFacilities = () => {
  const { userCompany } = useCompanyCache();

  return useQuery({
    queryKey: ['facilities', userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany) return [];

      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('company_id', userCompany.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Facility[];
    },
    enabled: !!userCompany,
    staleTime: 60000, // 1 minuto
  });
};

// Hook para crear una facility
export const useCreateFacility = () => {
  const queryClient = useQueryClient();
  const { userCompany } = useCompanyCache();
  const { showSuccess, showError } = useFleetNotifications();
  const { t } = useTranslation('facilities');

  return useMutation({
    mutationFn: async (facility: Omit<Facility, 'id' | 'company_id' | 'created_at' | 'created_by'>) => {
      if (!userCompany) throw new Error('No company found');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('facilities')
        .insert([{
          ...facility,
          company_id: userCompany.company_id,
          created_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      showSuccess(
        t('messages.create_success'),
        t('messages.create_success_description')
      );
    },
    onError: (error) => {
      console.error('Error creating facility:', error);
      showError(
        t('messages.error_title'),
        t('messages.error_description')
      );
    },
  });
};

// Hook para actualizar una facility
export const useUpdateFacility = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();
  const { t } = useTranslation('facilities');

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Facility> & { id: string }) => {
      const { data, error } = await supabase
        .from('facilities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      showSuccess(
        t('messages.update_success'),
        t('messages.update_success_description')
      );
    },
    onError: (error) => {
      console.error('Error updating facility:', error);
      showError(
        t('messages.error_title'),
        t('messages.error_description')
      );
    },
  });
};

// Hook para eliminar una facility
export const useDeleteFacility = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();
  const { t } = useTranslation('facilities');

  return useMutation({
    mutationFn: async (facilityId: string) => {
      const { error } = await supabase
        .from('facilities')
        .delete()
        .eq('id', facilityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      showSuccess(
        t('messages.delete_success'),
        t('messages.delete_success_description')
      );
    },
    onError: (error) => {
      console.error('Error deleting facility:', error);
      showError(
        t('messages.error_title'),
        t('messages.error_description')
      );
    },
  });
};
