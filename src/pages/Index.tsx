import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import Dashboard from './Dashboard';

export default function Index() {
  const navigate = useNavigate();
  const { 
    user, 
    userRole, 
    loading, 
    isSuperAdmin, 
    isCompanyOwner, 
    isOperationsManager, 
    isDispatcher, 
    isDriver 
  } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      // Si el usuario está autenticado pero no tiene rol asignado
      if (!userRole) {
        // Redirigir a perfil para que el usuario complete su información
        navigate('/profile');
        return;
      }
      
      // Redirigir según el rol del usuario
      if (isSuperAdmin) {
        navigate('/superadmin');
      } else if (isCompanyOwner) {
        navigate('/dashboard/owner');
      } else if (isOperationsManager) {
        navigate('/dashboard/operations');
      } else if (isDispatcher) {
        navigate('/dashboard/dispatch');
      } else if (isDriver) {
        navigate('/dashboard/driver');
      }
    }
  }, [loading, user, userRole, navigate, isSuperAdmin, isCompanyOwner, isOperationsManager, isDispatcher, isDriver]);

  const checkIfNeedsSetup = async () => {
    try {
      const { data, error } = await supabase.rpc('needs_initial_setup');
      
      if (error) {
        console.error('Error checking setup status:', error);
        return;
      }
      
      // Solo redirigir a setup si realmente necesita configuración inicial
      if (data === true) {
        navigate('/setup');
      } else {
        // Si no necesita setup pero no tiene rol, mostrar error o redirigir a perfil
        navigate('/profile');
      }
    } catch (err) {
      console.error('Setup check error:', err);
    }
  };

  // Show loading while determining user role
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Fallback: show generic dashboard if no specific role redirect
  return <Dashboard />;
}