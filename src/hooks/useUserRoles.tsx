import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

interface UseUserRolesReturn {
  loading: boolean;
  assignRole: (userId: string, companyId: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  removeRole: (userId: string, companyId: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  assignSelfRole: (role: UserRole) => Promise<{ success: boolean; error?: string }>;
  removeSelfRole: (role: UserRole) => Promise<{ success: boolean; error?: string }>;
}

export const useUserRoles = (): UseUserRolesReturn => {
  const [loading, setLoading] = useState(false);
  const { user, currentRole, refreshRoles } = useAuth();

  const assignRole = async (userId: string, companyId: string, role: UserRole) => {
    if (!user || !currentRole) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    // Only company owners and superadmins can assign roles
    if (currentRole.role !== 'company_owner' && currentRole.role !== 'superadmin') {
      return { success: false, error: 'No tienes permisos para asignar roles' };
    }

    setLoading(true);
    try {
      // Check if role already exists
      const { data: existingRole, error: checkError } = await supabase
        .from('user_company_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .eq('role', role)
        .eq('is_active', true)
        .maybeSingle();

      // If there's an error checking, still continue but log it
      if (checkError) {
        console.warn('Error checking existing role, proceeding with caution:', checkError);
      }

      if (existingRole) {
        return { success: false, error: 'El usuario ya tiene este rol asignado' };
      }

      const { error } = await supabase
        .from('user_company_roles')
        .insert({
          user_id: userId,
          company_id: companyId,
          role: role,
          is_active: true,
          delegated_by: user.id,
          delegated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error assigning role:', error);
        // Handle duplicate key error specifically
        if (error.code === '23505') {
          return { success: false, error: 'El usuario ya tiene este rol asignado' };
        }
        return { success: false, error: 'Error al asignar el rol' };
      }

      // Refresh roles to update the UI immediately
      await refreshRoles();

      return { success: true };
    } catch (error) {
      console.error('Error assigning role:', error);
      return { success: false, error: 'Error inesperado al asignar el rol' };
    } finally {
      setLoading(false);
    }
  };

  const removeRole = async (userId: string, companyId: string, role: UserRole) => {
    if (!user || !currentRole) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    // Only company owners and superadmins can remove roles
    if (currentRole.role !== 'company_owner' && currentRole.role !== 'superadmin') {
      return { success: false, error: 'No tienes permisos para remover roles' };
    }

    // Prevent removing company_owner role from others (only superadmin can do this)
    if (role === 'company_owner' && currentRole.role !== 'superadmin') {
      return { success: false, error: 'Solo un Super Administrador puede remover el rol de Propietario' };
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_company_roles')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .eq('role', role);

      if (error) {
        console.error('Error removing role:', error);
        return { success: false, error: 'Error al remover el rol' };
      }

      // Refresh roles to update the UI immediately
      await refreshRoles();

      return { success: true };
    } catch (error) {
      console.error('Error removing role:', error);
      return { success: false, error: 'Error inesperado al remover el rol' };
    } finally {
      setLoading(false);
    }
  };

  const assignSelfRole = async (role: UserRole) => {
    if (!user || !currentRole) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    // Only company owners can assign themselves additional roles
    if (currentRole.role !== 'company_owner') {
      return { success: false, error: 'Solo el propietario puede asignarse roles adicionales' };
    }

    const result = await assignRole(user.id, currentRole.company_id, role);
    
    if (result.success) {
      // Refresh roles to update the UI
      await refreshRoles();
    }
    
    return result;
  };

  const removeSelfRole = async (role: UserRole) => {
    if (!user || !currentRole) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    // Prevent removing the company_owner role from self
    if (role === 'company_owner') {
      return { success: false, error: 'No puedes remover tu propio rol de Propietario' };
    }

    const result = await removeRole(user.id, currentRole.company_id, role);
    
    if (result.success) {
      // Refresh roles to update the UI
      await refreshRoles();
    }
    
    return result;
  };

  return {
    loading,
    assignRole,
    removeRole,
    assignSelfRole,
    removeSelfRole,
  };
};