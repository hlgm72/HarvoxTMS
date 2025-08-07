import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFleetNotifications } from '@/components/notifications';

// Types for ACID operations
export interface ClientData {
  company_id: string;
  name: string;
  alias?: string;
  address?: string;
  phone?: string;
  email_domain?: string;
  dot_number?: string;
  mc_number?: string;
  logo_url?: string;
  notes?: string;
  is_active?: boolean;
  [key: string]: any;
}

export interface ClientContactData {
  client_id: string;
  name: string;
  email?: string;
  phone_office?: string;
  phone_mobile?: string;
  extension?: string;
  notes?: string;
  is_active?: boolean;
  [key: string]: any;
}

// Response types
interface ACIDResponse {
  success: boolean;
  operation?: string;
  message?: string;
  client?: any;
  contact?: any;
  [key: string]: any;
}

// Hook for creating/updating clients with ACID validation
export const useClientManagementACID = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async ({ 
      clientData, 
      clientId 
    }: { 
      clientData: ClientData; 
      clientId?: string; 
    }) => {
      console.log('🔄 Ejecutando operación ACID de cliente...', { clientData, clientId });

      const { data, error } = await supabase.rpc(
        'create_or_update_client_with_validation',
        {
          client_data: clientData,
          client_id: clientId || null
        }
      );

      if (error) {
        console.error('❌ Error ACID cliente:', error);
        throw new Error(error.message);
      }

      const result = data as ACIDResponse;
      if (!result?.success) {
        console.error('❌ Operación ACID falló:', result);
        throw new Error(result?.message || 'Error en operación de cliente');
      }

      console.log('✅ Operación ACID cliente exitosa:', result);
      return result;
    },
    onSuccess: (data: ACIDResponse) => {
      const operation = data.operation;
      const message = operation === 'CREATE' 
        ? 'Cliente creado exitosamente' 
        : 'Cliente actualizado exitosamente';
      
      showSuccess(message);
      
      // Invalidar cache relevante
      queryClient.invalidateQueries({ queryKey: ['company-clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (error: Error) => {
      console.error('❌ Error en operación ACID de cliente:', error);
      showError(`Error: ${error.message}`);
    },
  });
};

// Hook for creating/updating client contacts with ACID validation
export const useClientContactManagementACID = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async ({ 
      contactData, 
      contactId 
    }: { 
      contactData: ClientContactData; 
      contactId?: string; 
    }) => {
      console.log('🔄 Ejecutando operación ACID de contacto...', { contactData, contactId });

      const { data, error } = await supabase.rpc(
        'create_or_update_client_contact_with_validation',
        {
          contact_data: contactData,
          contact_id: contactId || null
        }
      );

      if (error) {
        console.error('❌ Error ACID contacto:', error);
        throw new Error(error.message);
      }

      const result = data as ACIDResponse;
      if (!result?.success) {
        console.error('❌ Operación ACID falló:', result);
        throw new Error(result?.message || 'Error en operación de contacto');
      }

      console.log('✅ Operación ACID contacto exitosa:', result);
      return result;
    },
    onSuccess: (data: ACIDResponse) => {
      const operation = data.operation;
      const message = operation === 'CREATE' 
        ? 'Contacto creado exitosamente' 
        : 'Contacto actualizado exitosamente';
      
      showSuccess(message);
      
      // Invalidar cache relevante
      queryClient.invalidateQueries({ queryKey: ['client-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['company-clients'] });
    },
    onError: (error: Error) => {
      console.error('❌ Error en operación ACID de contacto:', error);
      showError(`Error: ${error.message}`);
    },
  });
};

// Hook for deleting clients with ACID validation
export const useDeleteClientACID = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async (clientId: string) => {
      console.log('🔄 Ejecutando eliminación ACID de cliente...', clientId);

      const { data, error } = await supabase.rpc(
        'delete_client_with_validation',
        { client_id_param: clientId }
      );

      if (error) {
        console.error('❌ Error ACID eliminación cliente:', error);
        throw new Error(error.message);
      }

      const result = data as ACIDResponse;
      if (!result?.success) {
        console.error('❌ Eliminación ACID falló:', result);
        throw new Error(result?.message || 'Error en eliminación de cliente');
      }

      console.log('✅ Eliminación ACID cliente exitosa:', result);
      return result;
    },
    onSuccess: (data) => {
      showSuccess('Cliente desactivado exitosamente');
      
      // Invalidar cache relevante
      queryClient.invalidateQueries({ queryKey: ['company-clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (error: Error) => {
      console.error('❌ Error en eliminación ACID de cliente:', error);
      showError(`Error: ${error.message}`);
    },
  });
};

// Hook for deleting client contacts with ACID validation
export const useDeleteClientContactACID = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async (contactId: string) => {
      console.log('🔄 Ejecutando eliminación ACID de contacto...', contactId);

      const { data, error } = await supabase.rpc(
        'delete_client_contact_with_validation',
        { contact_id_param: contactId }
      );

      if (error) {
        console.error('❌ Error ACID eliminación contacto:', error);
        throw new Error(error.message);
      }

      const result = data as ACIDResponse;
      if (!result?.success) {
        console.error('❌ Eliminación ACID falló:', result);
        throw new Error(result?.message || 'Error en eliminación de contacto');
      }

      console.log('✅ Eliminación ACID contacto exitosa:', result);
      return result;
    },
    onSuccess: (data) => {
      showSuccess('Contacto desactivado exitosamente');
      
      // Invalidar cache relevante
      queryClient.invalidateQueries({ queryKey: ['client-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['company-clients'] });
    },
    onError: (error: Error) => {
      console.error('❌ Error en eliminación ACID de contacto:', error);
      showError(`Error: ${error.message}`);
    },
  });
};