import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export const useDeleteLoad = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (loadId: string): Promise<void> => {
      console.log('🗑️ useDeleteLoad - Starting deletion for load:', loadId);
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Verificar que la carga existe y el usuario tiene permisos
      const { data: loadData, error: loadError } = await supabase
        .from('loads')
        .select(`
          id, 
          load_number, 
          driver_user_id,
          status,
          created_by
        `)
        .eq('id', loadId)
        .single();

      if (loadError) {
        console.error('❌ Error verificando carga:', loadError);
        throw new Error('Error verificando la carga');
      }

      if (!loadData) {
        throw new Error('Carga no encontrada');
      }

      // Verificar permisos: solo el creador o company owners pueden eliminar
      const { data: userRoles } = await supabase
        .from('user_company_roles')
        .select('role, company_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const canDelete = loadData.created_by === user.id || 
                       userRoles?.some(role => 
                         role.role === 'company_owner' || 
                         role.role === 'operations_manager'
                       );

      if (!canDelete) {
        throw new Error('No tienes permisos para eliminar esta carga');
      }

      // Verificar que la carga no esté en un estado que no permita eliminación
      if (loadData.status === 'completed' || loadData.status === 'delivered') {
        throw new Error('No se puede eliminar una carga completada o entregada');
      }

      try {
        // 1. Eliminar documentos de la carga
        console.log('🗑️ Eliminando documentos de la carga...');
        const { error: documentsError } = await supabase
          .from('load_documents')
          .delete()
          .eq('load_id', loadId);

        if (documentsError) {
          console.error('❌ Error eliminando documentos:', documentsError);
          // No bloqueamos por documentos, solo advertimos
        }

        // 2. Eliminar paradas de la carga
        console.log('🗑️ Eliminando paradas de la carga...');
        const { error: stopsError } = await supabase
          .from('load_stops')
          .delete()
          .eq('load_id', loadId);

        if (stopsError) {
          console.error('❌ Error eliminando paradas:', stopsError);
          throw new Error('Error eliminando paradas de la carga');
        }

        // 3. Finalmente, eliminar la carga
        console.log('🗑️ Eliminando la carga...');
        const { error: deleteError } = await supabase
          .from('loads')
          .delete()
          .eq('id', loadId);

        if (deleteError) {
          console.error('❌ Error eliminando carga:', deleteError);
          throw new Error('Error eliminando la carga');
        }

        console.log('✅ Carga eliminada exitosamente:', loadData.load_number);

      } catch (error: any) {
        console.error('❌ Error en proceso de eliminación:', error);
        throw error;
      }
    },
    onSuccess: (_, loadId) => {
      console.log('✅ useDeleteLoad - Eliminación exitosa para:', loadId);
      
      // Invalidar las queries de cargas para refrescar la lista
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      
      toast({
        title: "Éxito",
        description: "Carga eliminada exitosamente",
      });
    },
    onError: (error: Error) => {
      console.error('❌ useDeleteLoad - Error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};