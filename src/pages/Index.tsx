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
    isDriver 
  } = useAuth();

  useEffect(() => {
    if (!loading && user && userRole) {
      // Redirect to appropriate dashboard based on role
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
      } else {
        // No role assigned, redirect to setup
        navigate('/setup');
      }
    }
  }, [loading, user, userRole, navigate, isSuperAdmin, isCompanyOwner, isOperationsManager, isDispatcher, isDriver]);

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