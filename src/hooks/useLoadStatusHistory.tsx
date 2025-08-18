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

      // Get user emails and profiles for the status changes
      const userIds = [...new Set(data.map(entry => entry.changed_by))];
      
      // Get emails through RPC function
      const { data: userEmails, error: userError } = await supabase
        .rpc('get_user_emails_for_company', {
          company_id_param: await getCurrentUserCompanyId()
        });

      // Get user profiles for names
      const { data: userProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      if (userError) {
        console.warn('Could not fetch user emails:', userError);
      }
      
      if (profileError) {
        console.warn('Could not fetch user profiles:', profileError);
      }

      // Enrich with user information
      const enrichedData = data.map(entry => {
        const userEmail = userEmails?.find(u => u.user_id === entry.changed_by)?.email;
        const userProfile = userProfiles?.find(u => u.user_id === entry.changed_by);
        
        let displayName = 'Usuario desconocido';
        if (userProfile && (userProfile.first_name || userProfile.last_name)) {
          displayName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim();
        } else if (userEmail) {
          displayName = userEmail.split('@')[0];
        }
        
        return {
          ...entry,
          user_email: userEmail || 'Unknown',
          user_name: displayName
        };
      });

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