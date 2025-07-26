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

        // Detect user's timezone from browser
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        console.log('Detected user timezone:', userTimezone);

        // Call the accept-google-invitation function
        const { data: result, error: functionError } = await supabase.functions.invoke('accept-google-invitation', {
          body: {
            invitationToken: invitationToken,
            userEmail: session.user.email,
            userId: session.user.id,
            userTimezone: userTimezone
          }
        });

        if (functionError) {
          throw new Error(functionError.message || 'Error accepting invitation');
        }

        if (!result.success) {
          throw new Error(result.error || 'Error accepting invitation');
        }

        // Don't show success message here - it will be shown in the Dashboard

        // **CRÍTICO**: Refrescar los roles antes de redirigir
        console.log('🔄 Refreshing user roles after invitation acceptance...');
        
        // Wait for role propagation and try multiple times if needed
        let attempts = 0;
        const maxAttempts = 5;
        let rolesRefreshed = false;
        
        while (attempts < maxAttempts && !rolesRefreshed) {
          // Progressive delay: 1s, 2s, 3s, 4s, 5s
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempts + 1)));
          
          // Refresh roles
          const refreshedRoles = await refreshRoles();
          
          // Verificar que el usuario sigue disponible en el contexto
          const { data: { session: currentSession }, error: currentSessionError } = await supabase.auth.getSession();
          
          if (currentSessionError) {
            console.error('❌ Error getting current session:', currentSessionError);
            throw new Error('Error getting current session');
          }
          
          if (!currentSession?.user) {
            console.error('❌ No user in current session after invitation acceptance');
            throw new Error('User session lost after invitation acceptance');
          }
          
          console.log('✅ User confirmed in session:', currentSession.user.id);
          
          // Check if roles are now available
          if (refreshedRoles && refreshedRoles.length > 0) {
            console.log('🎯 Roles found after attempt', attempts + 1);
            rolesRefreshed = true;
            break;
          }
          
          attempts++;
          console.log(`🔄 Attempt ${attempts}/${maxAttempts} - roles not yet available`);
        }
        
        if (!rolesRefreshed) {
          console.warn('⚠️ Roles not loaded after multiple attempts, forcing navigation');
        }

        // Set flag to refresh profile data after successful invitation acceptance
        localStorage.setItem('profile_refresh_needed', 'true');
        console.log('🔄 Setting profile refresh flag for new user');

        // Redirect to appropriate dashboard based on role with invitation flag
        const role = result.user.role;
        if (role === 'superadmin') {
          navigate('/superadmin?from_invitation=true', { replace: true });
        } else if (role === 'company_owner') {
          navigate('/dashboard/owner?from_invitation=true', { replace: true });
        } else if (role === 'operations_manager') {
          navigate('/dashboard/operations?from_invitation=true', { replace: true });
        } else if (role === 'dispatcher') {
          navigate('/dashboard/dispatch?from_invitation=true', { replace: true });
        } else if (role === 'driver') {
          navigate('/dashboard/driver?from_invitation=true', { replace: true });
        } else {
          navigate('/dashboard?from_invitation=true', { replace: true });
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