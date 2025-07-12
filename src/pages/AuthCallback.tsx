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
          
          // Check if user has a role assigned
          const { data: roleData, error: roleError } = await supabase
            .from('user_company_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .eq('is_active', true)
            .limit(1);

          console.log('OAuth role query result:', { roleData, roleError });

          // Show success message
          toast({
            title: "Welcome!",
            description: "You have been successfully signed in with Google.",
          });

          // Redirect based on role
          if (roleData?.[0]?.role === 'superadmin') {
            console.log('OAuth: Redirecting to superadmin dashboard');
            navigate('/superadmin');
          } else if (roleData?.[0]?.role) {
            console.log('OAuth: Redirecting to dashboard');
            navigate('/dashboard');
          } else {
            console.log('OAuth: No role found, redirecting to main page');
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