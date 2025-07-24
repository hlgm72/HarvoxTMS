import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Mail, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function NoAccess() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  // If no user, redirect to auth
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleBackToAuth = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-warning" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Acceso Restringido</h1>
            <p className="text-muted-foreground">
              Tu cuenta no tiene permisos para acceder a esta aplicación
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {user && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Cuenta actual:</p>
              <p className="font-medium break-all">{user.email}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Para obtener acceso, necesitas:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Recibir una invitación del administrador de tu empresa</li>
                <li>Contactar al administrador del sistema</li>
                <li>Verificar que estés usando el email correcto</li>
              </ul>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span>¿Necesitas ayuda? Contacta al administrador</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={handleSignOut}
              className="w-full"
              variant="outline"
            >
              Cerrar Sesión y Cambiar Cuenta
            </Button>
            
            <Button
              onClick={handleBackToAuth}
              variant="ghost"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}