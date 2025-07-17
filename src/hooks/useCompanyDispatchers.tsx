import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CompanyDispatcher {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_active: boolean;
}

export const useCompanyDispatchers = () => {
  return useQuery({
    queryKey: ["company-dispatchers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_company_roles")
        .select(`
          user_id,
          is_active,
          profiles (
            first_name,
            last_name,
            phone
          )
        `)
        .eq("role", "dispatcher")
        .eq("is_active", true);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        user_id: item.user_id,
        first_name: item.profiles?.first_name || null,
        last_name: item.profiles?.last_name || null,
        phone: item.profiles?.phone || null,
        is_active: item.is_active,
      })) as CompanyDispatcher[];
    },
  });
};