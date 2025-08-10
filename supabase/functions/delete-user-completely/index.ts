import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteUserRequest {
  userId: string;
  reason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método no permitido' }),
      { 
        status: 405, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuración de Supabase faltante');
    }

    // Crear cliente con service role para operaciones administrativas
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, reason }: DeleteUserRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId es requerido' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    console.log(`Iniciando eliminación completa del usuario: ${userId}. Razón: ${reason || 'No especificada'}`);

    // 1. Eliminar asignaciones de equipos
    const { error: equipmentError } = await supabase
      .from('equipment_assignments')
      .delete()
      .eq('driver_user_id', userId);

    if (equipmentError) {
      console.error('Error eliminando asignaciones de equipos:', equipmentError);
    } else {
      console.log('✅ Asignaciones de equipos eliminadas');
    }

    // 2. Eliminar tarjetas de combustible
    const { error: fuelCardsError } = await supabase
      .from('driver_fuel_cards')
      .delete()
      .eq('driver_user_id', userId);

    if (fuelCardsError) {
      console.error('Error eliminando tarjetas de combustible:', fuelCardsError);
    } else {
      console.log('✅ Tarjetas de combustible eliminadas');
    }

    // 3. Eliminar registros de owner_operators
    const { error: ownerOpError } = await supabase
      .from('owner_operators')
      .delete()
      .eq('user_id', userId);

    if (ownerOpError) {
      console.error('Error eliminando owner_operators:', ownerOpError);
    } else {
      console.log('✅ Registros de owner_operators eliminados');
    }

    // 4. Eliminar roles de usuario en empresas
    const { error: rolesError } = await supabase
      .from('user_company_roles')
      .delete()
      .eq('user_id', userId);

    if (rolesError) {
      console.error('Error eliminando roles de usuario:', rolesError);
    } else {
      console.log('✅ Roles de usuario eliminados');
    }

    // 5. Eliminar invitaciones (tanto activas como inactivas)
    const { error: invitationsError } = await supabase
      .from('user_invitations')
      .delete()
      .eq('target_user_id', userId);

    if (invitationsError) {
      console.error('Error eliminando invitaciones:', invitationsError);
    } else {
      console.log('✅ Invitaciones eliminadas');
    }

    // 6. Eliminar perfil de conductor
    const { error: profileError } = await supabase
      .from('driver_profiles')
      .delete()
      .eq('user_id', userId);

    if (profileError) {
      console.error('Error eliminando perfil de conductor:', profileError);
    } else {
      console.log('✅ Perfil de conductor eliminado');
    }

    // 7. Finalmente, eliminar el usuario de auth.users
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Error eliminando usuario de auth:', authError);
      throw new Error(`Error eliminando usuario de autenticación: ${authError.message}`);
    } else {
      console.log('✅ Usuario eliminado de auth.users');
    }

    console.log(`✅ Usuario ${userId} eliminado completamente del sistema`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Usuario eliminado completamente del sistema',
        userId,
        deletedAt: new Date().toISOString(),
        reason: reason || 'No especificada'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('Error en delete-user-completely:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Error interno del servidor',
        details: 'No se pudo completar la eliminación del usuario'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);