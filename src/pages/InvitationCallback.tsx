import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useFleetNotifications } from '@/components/notifications';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function InvitationCallback() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useFleetNotifications();
  const { refreshRoles } = useAuth();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleInvitationCallback = async () => {
      try {
        const invitationToken = searchParams.get('token');
        
        if (!invitationToken) {
          throw new Error('No invitation token provided');
        }

        // Get the current session after OAuth redirect
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw new Error(sessionError.message);
        }

        if (!session?.user) {
          throw new Error('No user session found');
        }

        console.log('Processing Google invitation for user:', session.user.id);

        // Call the accept-google-invitation function
        const { data: result, error: functionError } = await supabase.functions.invoke('accept-google-invitation', {
          body: {
            invitationToken: invitationToken,
            userEmail: session.user.email,
            userId: session.user.id
          }
        });

        if (functionError) {
          throw new Error(functionError.message || 'Error accepting invitation');
        }

        if (!result.success) {
          throw new Error(result.error || 'Error accepting invitation');
        }

        showSuccess("¡Invitación Aceptada!", `Bienvenido a ${result.user.company}. Tu rol es: ${result.user.role}`);

        // **CRÍTICO**: Refrescar los roles antes de redirigir
        console.log('🔄 Refreshing user roles after invitation acceptance...');
        
        // Esperar un poco más para asegurar que la inserción en la BD se complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await refreshRoles();
        
        // Pausa adicional para asegurar que los roles se carguen completamente
        await new Promise(resolve => setTimeout(resolve, 500));

        // Redirect to appropriate dashboard based on role
        const role = result.user.role;
        if (role === 'superadmin') {
          navigate('/superadmin');
        } else if (role === 'company_owner') {
          navigate('/dashboard/owner');
        } else if (role === 'operations_manager') {
          navigate('/dashboard/operations');
        } else if (role === 'dispatcher') {
          navigate('/dashboard/dispatch');
        } else if (role === 'driver') {
          navigate('/dashboard/driver');
        } else {
          navigate('/dashboard');
        }

      } catch (error: any) {
        console.error('Invitation callback error:', error);
        showError("Error", error.message || "Error processing invitation");
        navigate('/auth');
      }
    };

    handleInvitationCallback();
  }, [navigate, showSuccess, showError, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <h2 className="text-lg font-semibold">Procesando Invitación</h2>
              <p className="text-muted-foreground">Un momento mientras procesamos tu invitación...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}