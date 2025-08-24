import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Mail, Phone } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

export default function NoAccess() {
  const { t } = useTranslation(['common']);
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 flex items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-500" />
          </div>
          <CardTitle className="text-xl font-semibold">
            Acceso Pendiente
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Tu cuenta ha sido creada exitosamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Hola <strong>{user?.email}</strong>
            </p>
            <p className="text-sm">
              Tu cuenta está registrada pero necesitas ser invitado a una empresa por un administrador para acceder al sistema.
            </p>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              ¿Qué hacer ahora?
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Contacta al administrador de tu empresa</li>
              <li>• Solicita una invitación a FleetNest</li>
              <li>• Una vez invitado, podrás acceder al dashboard</li>
            </ul>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>soporte@fleetnest.com</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>+1 (555) 123-4567</span>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={signOut}
          >
            Cerrar Sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}