import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteUserRequest {
  userId: string;
  confirmationEmail: string;
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

    const { userId, confirmationEmail }: DeleteUserRequest = await req.json();

    if (!userId || !confirmationEmail) {
      return new Response(
        JSON.stringify({ error: 'userId y confirmationEmail son requeridos' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    console.log(`Iniciando eliminación permanente del usuario: ${userId}`);

    // 1. Verificar si el usuario existe y obtener su email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Usuario no encontrado en el sistema de autenticación' }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    const userEmail = userData.user.email;
    
    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: 'No se pudo obtener el email del usuario' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // 2. Verificar email de confirmación
    if (userEmail !== confirmationEmail) {
      return new Response(
        JSON.stringify({ error: 'El email de confirmación no coincide con el usuario a eliminar' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // 3. Eliminar datos relacionados en orden
    console.log('🗑️ Eliminando asignaciones de equipos...');
    const { error: equipmentError } = await supabase
      .from('equipment_assignments')
      .delete()
      .eq('driver_user_id', userId);

    if (equipmentError) {
      console.error('Error eliminando asignaciones de equipos:', equipmentError);
    } else {
      console.log('✅ Asignaciones de equipos eliminadas');
    }

    console.log('🗑️ Eliminando tarjetas de combustible...');
    const { error: fuelCardsError } = await supabase
      .from('driver_fuel_cards')
      .delete()
      .eq('driver_user_id', userId);

    if (fuelCardsError) {
      console.error('Error eliminando tarjetas de combustible:', fuelCardsError);
    } else {
      console.log('✅ Tarjetas de combustible eliminadas');
    }

    console.log('🗑️ Eliminando registros de owner_operators...');
    const { error: ownerOpError } = await supabase
      .from('owner_operators')
      .delete()
      .eq('user_id', userId);

    if (ownerOpError) {
      console.error('Error eliminando owner_operators:', ownerOpError);
    } else {
      console.log('✅ Registros de owner_operators eliminados');
    }

    console.log('🗑️ Eliminando roles de usuario...');
    const { error: rolesError } = await supabase
      .from('user_company_roles')
      .delete()
      .eq('user_id', userId);

    if (rolesError) {
      console.error('Error eliminando roles de usuario:', rolesError);
    } else {
      console.log('✅ Roles de usuario eliminados');
    }

    console.log('🗑️ Eliminando invitaciones...');
    const { error: invitationsError } = await supabase
      .from('user_invitations')
      .delete()
      .eq('target_user_id', userId);

    if (invitationsError) {
      console.error('Error eliminando invitaciones:', invitationsError);
    } else {
      console.log('✅ Invitaciones eliminadas');
    }

    console.log('🗑️ Eliminando cálculos de pago...');
    const { error: calculationsError } = await supabase
      .from('driver_period_calculations')
      .delete()
      .eq('driver_user_id', userId);

    if (calculationsError) {
      console.error('Error eliminando cálculos de pago:', calculationsError);
    } else {
      console.log('✅ Cálculos de pago eliminados');
    }

    console.log('🗑️ Eliminando instancias de gastos...');
    const { error: expenseInstancesError } = await supabase
      .from('expense_instances')
      .delete()
      .eq('driver_user_id', userId);

    if (expenseInstancesError) {
      console.error('Error eliminando instancias de gastos:', expenseInstancesError);
    } else {
      console.log('✅ Instancias de gastos eliminadas');
    }

    console.log('🗑️ Eliminando perfil de conductor...');
    const { error: profileError } = await supabase
      .from('driver_profiles')
      .delete()
      .eq('user_id', userId);

    if (profileError) {
      console.error('Error eliminando perfil de conductor:', profileError);
    } else {
      console.log('✅ Perfil de conductor eliminado');
    }

    console.log('🗑️ Eliminando perfil general si existe...');
    const { error: generalProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', userId);

    if (generalProfileError) {
      console.error('Error eliminando perfil general:', generalProfileError);
    } else {
      console.log('✅ Perfil general eliminado');
    }

    // 4. Finalmente, eliminar el usuario de auth.users
    console.log('🗑️ Eliminando usuario de auth.users...');
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
        userEmail,
        deletedAt: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('Error en permanently-delete-user:', error);
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