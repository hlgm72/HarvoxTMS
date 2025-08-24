import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useFleetNotifications } from '@/components/notifications';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useFleetNotifications();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the current session after OAuth redirect
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          showError(`Authentication Error: ${sessionError.message}`);
          navigate('/auth');
          return;
        }

        if (session?.user) {
          console.log('OAuth user logged in:', session.user.id);
          
          // First check if there are pending invitations for this email
          const { data: pendingInvitation, error: invitationError } = await supabase
            .from('user_invitations')
            .select('*')
            .eq('email', session.user.email?.toLowerCase())
            .is('accepted_at', null)
            .gte('expires_at', new Date().toISOString())
            .eq('is_active', true)
            .maybeSingle();

          console.log('Checking pending invitations:', { pendingInvitation, invitationError });

          // If there's a pending invitation, process it automatically
          if (pendingInvitation && !invitationError) {
            console.log('Found pending invitation, processing automatically...');
            
            try {
              const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
              
              const { data: functionResult, error: functionError } = await supabase.functions.invoke('accept-google-invitation', {
                body: {
                  invitationToken: pendingInvitation.invitation_token,
                  userEmail: session.user.email,
                  userId: session.user.id,
                  userTimezone: userTimezone
                }
              });

              if (functionError) {
                console.error('Error processing invitation:', functionError);
                showError('Error', 'Error procesando la invitación automáticamente');
              } else if (functionResult.success) {
                console.log('Invitation processed successfully:', functionResult);
                showSuccess('¡Bienvenido!', `Te has unido exitosamente como ${functionResult.user.role}`);
                
                // Wait a moment for role propagation and redirect
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Redirect based on role from invitation
                const role = functionResult.user.role;
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
                return; // Exit early since invitation was processed
              }
            } catch (error) {
              console.error('Error in automatic invitation processing:', error);
              // Continue with normal flow if invitation processing fails
            }
          }
          
          // Get all user roles (normal flow if no invitation or invitation processing failed)
          const { data: roleData, error: roleError } = await supabase
            .from('user_company_roles')
            .select('role, id, company_id')
            .eq('user_id', session.user.id)
            .eq('is_active', true);

          console.log('OAuth role query result:', { roleData, roleError });

          // Show success message (if not already shown above)
          if (!pendingInvitation) {
            showSuccess('¡Bienvenido!', 'Has sido autenticado exitosamente con Google.');
          }

          const roles = roleData || [];
          
          // Check if there's a previously stored role that's still valid
          const storedRoleString = localStorage.getItem('currentRole') || localStorage.getItem('lastActiveRole');
          let targetRole = null;
          
          if (storedRoleString) {
            try {
              const storedRole = JSON.parse(storedRoleString);
              // Verify the stored role is still valid (user still has this role)
              const isStillValid = roles.some(r => r.role === storedRole.role && r.company_id === storedRole.company_id);
              if (isStillValid) {
                targetRole = storedRole.role;
                console.log('OAuth: Using previously active role:', targetRole);
              }
            } catch (e) {
              console.warn('OAuth: Error parsing stored role:', e);
            }
          }
          
          // If no valid stored role, use priority hierarchy
          if (!targetRole && roles.length > 0) {
            const hasRole = (role: string) => roles.some(r => r.role === role);
            if (hasRole('superadmin')) {
              targetRole = 'superadmin';
            } else if (hasRole('company_owner')) {
              targetRole = 'company_owner';
            } else if (hasRole('operations_manager')) {
              targetRole = 'operations_manager';
            } else if (hasRole('dispatcher')) {
              targetRole = 'dispatcher';
            } else if (hasRole('driver')) {
              targetRole = 'driver';
            }
            console.log('OAuth: Using role from hierarchy:', targetRole);
          }

          // Redirect based on determined role
          if (targetRole === 'superadmin') {
            console.log('OAuth: Redirecting to superadmin dashboard');
            navigate('/superadmin');
          } else if (targetRole === 'company_owner') {
            console.log('OAuth: Redirecting to owner dashboard');
            navigate('/dashboard/owner');
          } else if (targetRole === 'operations_manager') {
            console.log('OAuth: Redirecting to operations dashboard');
            navigate('/dashboard/operations');
          } else if (targetRole === 'dispatcher') {
            console.log('OAuth: Redirecting to dispatcher dashboard');
            navigate('/dashboard/dispatch');
          } else if (targetRole === 'driver') {
            console.log('OAuth: Redirecting to driver dashboard');
            navigate('/dashboard/driver');
          } else {
            // Usuario sin roles asignados - redirigir a página de acceso restringido
            console.log('OAuth: No roles found for user, redirecting to no-access page');
            showError('Acceso Restringido', 'Tu cuenta no tiene permisos para acceder a esta aplicación.');
            navigate('/no-access');
          }
        } else {
          // No session found, redirect to auth
          console.log('No session found, redirecting to auth');
          navigate('/auth');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        showError('Authentication Error', 'Something went wrong during authentication.');
        navigate('/auth');
      }
    };

    handleAuthCallback();
  }, [navigate, showSuccess, showError]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <h2 className="text-lg font-semibold">Completing Sign In</h2>
              <p className="text-muted-foreground">Please wait while we complete your authentication...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}