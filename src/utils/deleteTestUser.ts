import { supabase } from '@/integrations/supabase/client';

export const deleteTestUser = async () => {
  try {
    // Llamar a la edge function para eliminar el usuario
    const { data, error } = await supabase.functions.invoke('delete-test-user', {
      body: {
        userId: '6f870d79-306f-4d14-8863-aed23431a2cd',
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

// Llamar inmediatamente
deleteTestUser().then(result => {
  console.log('Deletion result:', result);
});