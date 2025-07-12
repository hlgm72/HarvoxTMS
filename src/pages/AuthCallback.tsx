import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the current session after OAuth redirect
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          toast({
            title: "Authentication Error",
            description: sessionError.message,
            variant: "destructive"
          });
          navigate('/auth');
          return;
        }

        if (session?.user) {
          console.log('OAuth user logged in:', session.user.id);
          
          // Get all user roles first
          const { data: roleData, error: roleError } = await supabase
            .from('user_company_roles')
            .select('role, id, company_id')
            .eq('user_id', session.user.id)
            .eq('is_active', true);

          console.log('OAuth role query result:', { roleData, roleError });

          // Show success message
          toast({
            title: "¡Bienvenido!",
            description: "Has sido autenticado exitosamente con Google.",
          });

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
            console.log('OAuth: No specific role found, redirecting to main page');
            navigate('/');
          }
        } else {
          // No session found, redirect to auth
          console.log('No session found, redirecting to auth');
          navigate('/auth');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        toast({
          title: "Authentication Error",
          description: "Something went wrong during authentication.",
          variant: "destructive"
        });
        navigate('/auth');
      }
    };

    handleAuthCallback();
  }, [navigate, toast]);

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