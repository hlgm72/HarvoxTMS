import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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
    isDriver,
    _forceUpdate
  } = useAuth();

  useEffect(() => {
    // Wait for auth context to fully initialize before redirecting
    if (!loading && user) {
      // Si el usuario está autenticado pero no tiene rol asignado
      if (!userRole) {
        // Redirigir a perfil para que el usuario complete su información
        navigate('/profile');
        return;
      }
      
      // Redirigir según el rol activo del usuario (no por jerarquía)
      if (isSuperAdmin) {
        navigate('/superadmin');
      } else if (userRole?.role === 'company_owner') {
        navigate('/dashboard/owner');
      } else if (userRole?.role === 'operations_manager') {
        navigate('/dashboard/operations');
      } else if (userRole?.role === 'dispatcher') {
        navigate('/dashboard/dispatch');
      } else if (userRole?.role === 'driver') {
        navigate('/dashboard/driver');
      }
    }
  }, [loading, user, userRole, navigate, isSuperAdmin, isCompanyOwner, isOperationsManager, isDispatcher, isDriver, _forceUpdate]);


  // Show loading while determining user role or while auth context initializes
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