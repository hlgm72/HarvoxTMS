import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Loader2 } from 'lucide-react';

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
  const { user, userRole, loading, isAuthenticated } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Verificando autenticación...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Shield className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <h2 className="text-lg font-semibold">Acceso Restringido</h2>
                <p className="text-muted-foreground">
                  Debes iniciar sesión para acceder a esta página.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check role requirement
  if (requiredRole && userRole?.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Shield className="h-12 w-12 text-destructive" />
              <div className="text-center">
                <h2 className="text-lg font-semibold text-destructive">
                  Permisos Insuficientes
                </h2>
                <p className="text-muted-foreground">
                  No tienes los permisos necesarios para acceder a esta página.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Rol requerido: <span className="font-medium">{requiredRole}</span>
                </p>
                {userRole && (
                  <p className="text-sm text-muted-foreground">
                    Tu rol actual: <span className="font-medium">{userRole.role}</span>
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};