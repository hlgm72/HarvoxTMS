import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
  requireAuth?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  requiredRole, 
  requireAuth = true 
}: ProtectedRouteProps) => {
  const { user, userRole, userRoles, loading, isAuthenticated, currentRole } = useAuth();
  const { t } = useTranslation('common');

  // Show loading spinner only during initial auth loading
  // Don't show spinner if user is authenticated and roles are already loaded (even if currentRole is null)
  const shouldShowLoading = loading || (user && userRoles === null);
  
  if (shouldShowLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">{t('messages.verifying_auth')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    // If user is not authenticated, redirect to home (which shows landing)
    return <Navigate to="/" replace />;
  }

  // Check role requirement - check if user has the required role among ALL their roles
  const hasRequiredRole = requiredRole ? userRoles?.some(role => role.role === requiredRole) : true;
  if (requiredRole && !hasRequiredRole) {
    console.log('🔒 Access denied - Required role:', requiredRole, 'User roles:', userRoles?.map(r => r.role));
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Shield className="h-12 w-12 text-destructive" />
              <div className="text-center">
                <h2 className="text-lg font-semibold text-destructive">
                  {t('messages.insufficient_permissions')}
                </h2>
                <p className="text-muted-foreground">
                  {t('messages.insufficient_permissions_desc')}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('messages.required_role')} <span className="font-medium">{requiredRole}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('messages.current_role')} <span className="font-medium">{userRoles?.map(r => r.role).join(', ') || 'ninguno'}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};