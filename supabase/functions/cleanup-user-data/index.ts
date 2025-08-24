import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupUserRequest {
  userId: string;
  userEmail?: string;
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { userId, userEmail }: CleanupUserRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId es requerido' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    console.log(`🧹 Iniciando limpieza de datos para usuario: ${userId} (${userEmail || 'email no especificado'})`);

    // Contadores para rastrear eliminaciones
    let deletedCounts = {
      driverPeriodCalculations: 0,
      expenseInstances: 0,
      equipmentAssignments: 0,
      driverFuelCards: 0,
      ownerOperators: 0,
      userCompanyRoles: 0,
      userInvitations: 0,
      driverProfiles: 0
    };

    // 1. Eliminar cálculos de pago del conductor
    const { data: calcData, error: calculationsError } = await supabase
      .from('driver_period_calculations')
      .delete()
      .eq('driver_user_id', userId)
      .select();

    if (calculationsError) {
      console.error('❌ Error eliminando cálculos de pago:', calculationsError);
    } else {
      deletedCounts.driverPeriodCalculations = calcData?.length || 0;
      console.log(`✅ Cálculos de pago eliminados: ${deletedCounts.driverPeriodCalculations}`);
    }

    // 2. Eliminar instancias de gastos
    const { data: expenseData, error: expenseInstancesError } = await supabase
      .from('expense_instances')
      .delete()
      .eq('user_id', userId)
      .select();

    if (expenseInstancesError) {
      console.error('❌ Error eliminando instancias de gastos:', expenseInstancesError);
    } else {
      deletedCounts.expenseInstances = expenseData?.length || 0;
      console.log(`✅ Instancias de gastos eliminadas: ${deletedCounts.expenseInstances}`);
    }

    // 3. Eliminar asignaciones de equipos
    const { data: equipData, error: equipmentError } = await supabase
      .from('equipment_assignments')
      .delete()
      .eq('driver_user_id', userId)
      .select();

    if (equipmentError) {
      console.error('❌ Error eliminando asignaciones de equipos:', equipmentError);
    } else {
      deletedCounts.equipmentAssignments = equipData?.length || 0;
      console.log(`✅ Asignaciones de equipos eliminadas: ${deletedCounts.equipmentAssignments}`);
    }

    // 4. Eliminar tarjetas de combustible
    const { data: fuelData, error: fuelCardsError } = await supabase
      .from('driver_fuel_cards')
      .delete()
      .eq('driver_user_id', userId)
      .select();

    if (fuelCardsError) {
      console.error('❌ Error eliminando tarjetas de combustible:', fuelCardsError);
    } else {
      deletedCounts.driverFuelCards = fuelData?.length || 0;
      console.log(`✅ Tarjetas de combustible eliminadas: ${deletedCounts.driverFuelCards}`);
    }

    // 5. Eliminar registros de owner_operators
    const { data: ownerData, error: ownerOpError } = await supabase
      .from('owner_operators')
      .delete()
      .eq('user_id', userId)
      .select();

    if (ownerOpError) {
      console.error('❌ Error eliminando owner_operators:', ownerOpError);
    } else {
      deletedCounts.ownerOperators = ownerData?.length || 0;
      console.log(`✅ Registros de owner_operators eliminados: ${deletedCounts.ownerOperators}`);
    }

    // 6. Eliminar roles de usuario en empresas
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_company_roles')
      .delete()
      .eq('user_id', userId)
      .select();

    if (rolesError) {
      console.error('❌ Error eliminando roles de usuario:', rolesError);
    } else {
      deletedCounts.userCompanyRoles = rolesData?.length || 0;
      console.log(`✅ Roles de usuario eliminados: ${deletedCounts.userCompanyRoles}`);
    }

    // 7. Eliminar invitaciones
    const { data: invitData, error: invitationsError } = await supabase
      .from('user_invitations')
      .delete()
      .eq('target_user_id', userId)
      .select();

    if (invitationsError) {
      console.error('❌ Error eliminando invitaciones:', invitationsError);
    } else {
      deletedCounts.userInvitations = invitData?.length || 0;
      console.log(`✅ Invitaciones eliminadas: ${deletedCounts.userInvitations}`);
    }

    // 8. Eliminar perfil de conductor
    const { data: profileData, error: profileError } = await supabase
      .from('driver_profiles')
      .delete()
      .eq('user_id', userId)
      .select();

    if (profileError) {
      console.error('❌ Error eliminando perfil de conductor:', profileError);
    } else {
      deletedCounts.driverProfiles = profileData?.length || 0;
      console.log(`✅ Perfil de conductor eliminado: ${deletedCounts.driverProfiles}`);
    }

    // Calcular total de registros eliminados
    const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0);

    console.log(`🧹 Limpieza completada. Total de registros eliminados: ${totalDeleted}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Datos del usuario limpiados exitosamente',
        userId,
        userEmail,
        deletedCounts,
        totalDeleted,
        cleanedAt: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('❌ Error en cleanup-user-data:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Error interno del servidor',
        details: 'No se pudo completar la limpieza de datos del usuario'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);