import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface LoadStatusHistoryEntry {
  id: string;
  load_id: string;
  previous_status: string | null;
  new_status: string;
  changed_at: string;
  changed_by: string;
  notes: string | null;
  eta_provided: string | null;
  stop_id: string | null;
  user_email?: string;
  user_name?: string;
}

export const useLoadStatusHistory = (loadId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['load-status-history', loadId],
    queryFn: async () => {
      if (!user || !loadId) return [];

      const { data, error } = await supabase
        .from('load_status_history')
        .select(`
          id,
          load_id,
          previous_status,
          new_status,
          changed_at,
          changed_by,
          notes,
          eta_provided,
          stop_id
        `)
        .eq('load_id', loadId)
        .order('changed_at', { ascending: false });

      if (error) throw error;

      // Get user emails for the status changes
      const userIds = [...new Set(data.map(entry => entry.changed_by))];
      const { data: userEmails, error: userError } = await supabase
        .rpc('get_user_emails_for_company', {
          company_id_param: await getCurrentUserCompanyId()
        });

      if (userError) {
        console.warn('Could not fetch user emails:', userError);
      }

      // Enrich with user information
      const enrichedData = data.map(entry => ({
        ...entry,
        user_email: userEmails?.find(u => u.user_id === entry.changed_by)?.email || 'Unknown',
        user_name: userEmails?.find(u => u.user_id === entry.changed_by)?.email?.split('@')[0] || 'Unknown'
      }));

      return enrichedData as LoadStatusHistoryEntry[];
    },
    enabled: !!user && !!loadId,
    staleTime: 60000, // 1 minute
  });
};

async function getCurrentUserCompanyId(): Promise<string> {
  const { data } = await supabase
    .from('user_company_roles')
    .select('company_id')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .eq('is_active', true)
    .limit(1)
    .single();
  
  return data?.company_id || '';
}