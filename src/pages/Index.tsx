import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import Dashboard from './Dashboard';
import Landing from './Landing';

export default function Index() {
  const navigate = useNavigate();
  const { 
    user, 
    userRole, 
    userRoles,
    loading, 
    isSuperAdmin, 
    isCompanyOwner, 
    isOperationsManager, 
    isDispatcher, 
    isDriver,
    _forceUpdate
  } = useAuth();

  useEffect(() => {
    console.log('🏠 Index.tsx useEffect triggered:', {
      loading,
      user: user?.id,
      userRole: userRole?.role,
      userRoles: userRoles?.length,
      _forceUpdate
    });

    // Check for login success message
    const loginSuccess = localStorage.getItem('loginSuccess');
    if (loginSuccess === 'true') {
      localStorage.removeItem('loginSuccess');
      console.log('🏠 Welcome back! Login successful');
    }

    // Wait for auth context to fully initialize before redirecting
    if (!loading && user) {
      console.log('🏠 User is authenticated, checking roles...');
      
      // Esperar a que los roles se carguen completamente
      // Si userRoles es null, aún se están cargando
      if (userRoles === null) {
        console.log('🏠 Roles still loading, waiting...');
        return;
      }
      
      // Si el usuario está autenticado pero no tiene rol asignado
      if (userRoles.length === 0 || !userRole) {
        console.log('🏠 No role assigned, redirecting to profile');
        navigate('/profile');
        return;
      }
      
      console.log('🏠 User has role:', userRole.role, 'redirecting...');
      
      // Redirigir según el rol activo del usuario (no por jerarquía)
      if (isSuperAdmin) {
        console.log('🏠 Redirecting to superadmin dashboard');
        navigate('/superadmin');
      } else if (userRole?.role === 'company_owner') {
        console.log('🏠 Redirecting to owner dashboard');
        navigate('/dashboard/owner');
      } else if (userRole?.role === 'operations_manager') {
        console.log('🏠 Redirecting to operations dashboard');
        navigate('/dashboard/operations');
      } else if (userRole?.role === 'dispatcher') {
        console.log('🏠 Redirecting to dispatcher dashboard');
        navigate('/dashboard/dispatch');
      } else if (userRole?.role === 'driver') {
        console.log('🏠 Redirecting to driver dashboard');
        navigate('/dashboard/driver');
      }
    } else if (!loading && !user) {
      // Si no hay usuario autenticado, mostrar landing
      console.log('🏠 No authenticated user, showing landing page');
      // No hacemos return aquí, dejamos que se renderice la Landing abajo
    } else {
      console.log('🏠 Still loading or no user:', { loading, hasUser: !!user });
    }
  }, [loading, user, userRole, userRoles, navigate, isSuperAdmin, isCompanyOwner, isOperationsManager, isDispatcher, isDriver, _forceUpdate]);


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

  // Si no hay usuario autenticado, mostrar landing page
  if (!user) {
    return <Landing />;
  }

  // Fallback: show generic dashboard if no specific role redirect
  return <Dashboard />;
}