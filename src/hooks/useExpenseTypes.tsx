import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useExpenseTypes() {
  const { userRole } = useAuth();

  return useQuery({
    queryKey: ['expense-types', userRole?.company_id],
    queryFn: async () => {
      if (!userRole?.company_id) {
        return [];
      }

      const { data, error } = await supabase
        .from('expense_types')
        .select('*')
        .eq('company_id', userRole.company_id)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching expense types:', error);
        throw error;
      }

      return data;
    },
    enabled: !!userRole?.company_id
  });
}