import { useEffect, useRef } from 'react';
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
  
  const hasProcessedRedirect = useRef(false);

  useEffect(() => {
    // Prevent multiple redirects during auth state changes
    if (hasProcessedRedirect.current) return;
    
    // console.log('🏠 Index.tsx useEffect triggered:', {
    //   loading,
    //   user: user?.id,
    //   userRole: userRole?.role,
    //   userRoles: userRoles?.length,
    //   hasProcessed: hasProcessedRedirect.current
    // });

    // Check for login success message
    const loginSuccess = localStorage.getItem('loginSuccess');
    if (loginSuccess === 'true') {
      localStorage.removeItem('loginSuccess');
      // Welcome back! Login successful (silent)
    }

    // Wait for auth context to fully initialize before redirecting
    if (!loading && user) {
      // User is authenticated, checking roles...
      
      // Esperar a que los roles se carguen completamente
      // Si userRoles es null, aún se están cargando
      if (userRoles === null) {
        // Roles still loading, waiting...
        return;
      }
      
      // Si el usuario está autenticado pero no tiene rol asignado
      if (userRoles.length === 0 || !userRole) {
        // No role assigned, redirecting to profile
        hasProcessedRedirect.current = true;
        navigate('/profile');
        return;
      }
      
      // Redirigir según el rol activo del usuario (no por jerarquía)
      hasProcessedRedirect.current = true;
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
    } else if (!loading && !user) {
      // Si no hay usuario autenticado, mostrar landing
      // console.log('🏠 No authenticated user, showing landing page');
      // Reset the redirect flag when showing landing
      hasProcessedRedirect.current = false;
    } else {
      // console.log('🏠 Still loading or no user:', { loading, hasUser: !!user });
    }
  }, [loading, user, userRole, userRoles, navigate, isSuperAdmin, isCompanyOwner, isOperationsManager, isDispatcher, isDriver]);


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

  // Let the specific dashboard handle its own loading state
  return null;
}