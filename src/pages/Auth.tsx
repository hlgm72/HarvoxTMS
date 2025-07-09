import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Truck, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    companyName: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // TODO: Implement actual authentication logic
      console.log(isLogin ? 'Login attempt:' : 'Signup attempt:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes
      setError('Funcionalidad de autenticación pendiente de implementar');
      
    } catch (err: any) {
      setError(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to landing */}
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al inicio
          </Link>
        </div>

        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex items-center space-x-2">
                <Truck className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold text-primary">FleetNest</span>
              </div>
            </div>
            <CardTitle className="text-2xl">
              {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? 'Accede a tu panel de gestión de flota' 
                : 'Registra tu empresa y comienza gratis'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Nombre</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        required={!isLogin}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Apellido</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        required={!isLogin}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nombre de la Empresa</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      placeholder="Transport Solutions LLC"
                      required={!isLogin}
                      disabled={loading}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="admin@tuempresa.com"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder={isLogin ? 'Tu contraseña' : 'Mínimo 8 caracteres'}
                  required
                  disabled={loading}
                  minLength={isLogin ? undefined : 8}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isLogin ? 'Iniciando sesión...' : 'Creando cuenta...'}
                  </>
                ) : (
                  isLogin ? 'Iniciar Sesión' : 'Crear Cuenta Gratis'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setFormData({
                    email: '',
                    password: '',
                    firstName: '',
                    lastName: '',
                    companyName: ''
                  });
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                disabled={loading}
              >
                {isLogin 
                  ? '¿No tienes cuenta? Regístrate gratis' 
                  : '¿Ya tienes cuenta? Inicia sesión'
                }
              </button>
            </div>

            {!isLogin && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>Incluye:</strong> Dashboard completo, tracking GPS, gestión de conductores, 
                  reportes avanzados y soporte técnico. Sin compromisos, cancela cuando quieras.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            Al continuar, aceptas nuestros{' '}
            <a href="#" className="text-primary hover:underline">
              Términos de Servicio
            </a>{' '}
            y{' '}
            <a href="#" className="text-primary hover:underline">
              Política de Privacidad
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}