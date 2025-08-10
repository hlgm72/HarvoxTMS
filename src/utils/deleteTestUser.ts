import { supabase } from '@/integrations/supabase/client';

export const deleteTestUser = async () => {
  try {
    // Llamar a la edge function para eliminar el usuario por email
    const { data, error } = await supabase.functions.invoke('delete-test-user', {
      body: {
        confirmEmail: 'hgig7274@gmail.com'
      }
    });

    if (error) {
      console.error('Error calling delete function:', error);
      return { success: false, error: error.message };
    }

    console.log('Delete function response:', data);
    return data;
  } catch (error: any) {
    console.error('Error deleting test user:', error);
    return { success: false, error: error.message };
  }
};

// Nueva función para eliminación completa por userId
export const deleteUserCompletely = async (userId: string, reason?: string): Promise<{ success: boolean; message: string }> => {
  try {
    console.log(`Iniciando eliminación completa del usuario: ${userId}`);

    // Usar la nueva función edge para eliminación completa y segura
    const { data, error } = await supabase.functions.invoke('delete-user-completely', {
      body: {
        userId,
        reason: reason || 'Eliminación manual desde interfaz'
      }
    });

    if (error) {
      console.error('Error calling delete-user-completely function:', error);
      throw new Error(`Error en función de eliminación: ${error.message}`);
    }

    if (!data || !data.success) {
      throw new Error(data?.error || 'Error desconocido en la eliminación');
    }

    console.log(`Usuario ${userId} eliminado exitosamente:`, data);
    return {
      success: true,
      message: data.message || 'Usuario eliminado completamente del sistema'
    };

  } catch (error: any) {
    console.error('Error in deleteUserCompletely:', error);
    return {
      success: false,
      message: error.message || 'Error desconocido al eliminar usuario'
    };
  }
};

// Función para ser llamada cuando sea necesario
// deleteTestUser().then(result => {
//   console.log('Deletion result:', result);
// });