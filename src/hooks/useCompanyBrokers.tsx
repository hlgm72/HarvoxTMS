import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export interface CompanyBroker {
  id: string;
  name: string;
  alias?: string;
  logo_url?: string;
  address?: string;
  email_domain?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

export const useCompanyBrokers = () => {
  const [brokers, setBrokers] = useState<CompanyBroker[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchCompanyBrokers = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Obtener la compañía del usuario actual
        const { data: userCompanyRole, error: companyError } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (companyError || !userCompanyRole) {
          console.error('Error obteniendo compañía del usuario:', companyError);
          return;
        }

        // Obtener todos los brokers de la compañía
        const { data: brokers, error: brokersError } = await supabase
          .from('company_brokers')
          .select('*')
          .eq('company_id', userCompanyRole.company_id)
          .eq('is_active', true)
          .order('name');

        if (brokersError) {
          console.error('Error obteniendo brokers:', brokersError);
          return;
        }

        setBrokers(brokers || []);

      } catch (error) {
        console.error('Error general obteniendo brokers:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los brokers",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyBrokers();
  }, [user, toast]);

  return { brokers, loading, refetch: () => setLoading(true) };
};