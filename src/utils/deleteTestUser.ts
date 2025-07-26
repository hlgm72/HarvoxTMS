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

// Función para ser llamada cuando sea necesario
// deleteTestUser().then(result => {
//   console.log('Deletion result:', result);
// });