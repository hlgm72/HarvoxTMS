import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DeductionsStats {
  activeTemplates: number;
  totalMonthlyAmount: number;
  affectedDrivers: number;
}

export function useDeductionsStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['deductions-stats', user?.id],
    queryFn: async (): Promise<DeductionsStats> => {
      if (!user?.id) return { activeTemplates: 0, totalMonthlyAmount: 0, affectedDrivers: 0 };

      // Obtener la empresa del usuario actual
      const { data: userRoles } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!userRoles || userRoles.length === 0) {
        return { activeTemplates: 0, totalMonthlyAmount: 0, affectedDrivers: 0 };
      }

      // Tomar la primera empresa (en caso de múltiples roles)
      const companyId = userRoles[0].company_id;

      // Obtener todos los usuarios de la empresa (conductores y dispatchers)
      const { data: companyUsers } = await supabase
        .from('user_company_roles')
        .select('user_id')
        .eq('company_id', companyId)
        .in('role', ['driver', 'dispatcher'])
        .eq('is_active', true);

      if (!companyUsers || companyUsers.length === 0) {
        return { activeTemplates: 0, totalMonthlyAmount: 0, affectedDrivers: 0 };
      }

      const userIds = companyUsers.map(role => role.user_id);

      // Obtener plantillas activas para estos conductores
      const { data: templates, error } = await supabase
        .from('recurring_expense_templates')
        .select('user_id, amount, frequency')
        .in('user_id', userIds)
        .eq('is_active', true);

      if (error) throw error;

      if (!templates || templates.length === 0) {
        return { activeTemplates: 0, totalMonthlyAmount: 0, affectedDrivers: 0 };
      }

      // Calcular estadísticas
      const activeTemplates = templates.length;
      
      // Calcular total mensual (convertir todas las frecuencias a mensual)
      const totalMonthlyAmount = templates.reduce((sum, template) => {
        let monthlyAmount = 0;
        
        switch (template.frequency) {
          case 'weekly':
            monthlyAmount = template.amount * 4.33; // Promedio de semanas por mes
            break;
          case 'biweekly':
            monthlyAmount = template.amount * 2.17; // Promedio de quincenas por mes
            break;
          case 'monthly':
            monthlyAmount = template.amount;
            break;
          default:
            monthlyAmount = template.amount;
        }
        
        return sum + monthlyAmount;
      }, 0);

      // Contar conductores únicos afectados
      const affectedDrivers = new Set(templates.map(t => t.user_id)).size;

      return {
        activeTemplates,
        totalMonthlyAmount: Math.round(totalMonthlyAmount * 100) / 100, // Redondear a 2 decimales
        affectedDrivers
      };
    },
    enabled: !!user?.id,
  });
}