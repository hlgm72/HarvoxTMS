import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2, Shield, Users, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFleetNotifications } from '@/components/notifications';

export default function Invitation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useFleetNotifications();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string>('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (token) {
      validateInvitation();
    }
  }, [token]);

  // Clear form autofill on component mount
  useEffect(() => {
    // Reset form data to ensure clean state
    setFormData({
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: ''
    });

    // Also clear browser autofill if any
    const timer = setTimeout(() => {
      const inputs = document.querySelectorAll('input[type="text"], input[type="password"]');
      inputs.forEach((input: any) => {
        if (input.autocomplete !== 'off') {
          input.value = '';
        }
      });
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const validateInvitation = async () => {
    try {
      const { data, error } = await supabase.rpc('validate_invitation_token', {
        token_param: token
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data || data.length === 0) {
        setError('Invalid invitation link');
        return;
      }

      const invitationData = data[0];
      
      if (!invitationData.is_valid) {
        setError('This invitation has expired or has already been used');
        return;
      }

      // Get company information from the RPC result
      setInvitation({
        ...invitationData,
        companyName: invitationData.company_name || 'Unknown Company'
      });

      // Auto-fill name fields if available
      if (invitationData.first_name || invitationData.last_name) {
        setFormData(prev => ({
          ...prev,
          firstName: invitationData.first_name || '',
          lastName: invitationData.last_name || ''
        }));
      }
    } catch (err: any) {
      setError(err.message || 'Error validating invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Detect user timezone
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('Detected user timezone:', userTimezone);

      const { data: result, error: functionError } = await supabase.functions.invoke('accept-invitation', {
        body: {
          invitationToken: token,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          userTimezone: userTimezone
        }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Error accepting invitation');
      }

      if (!result.success) {
        throw new Error(result.error || 'Error accepting invitation');
      }

      // Auto-login the user after account creation
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password: formData.password,
      });

      if (signInError) {
        throw new Error(`Error al iniciar sesión: ${signInError.message}`);
      }

      // Redirect to processing page with invitation token and role
      const userRole = result.user?.role || invitation.role;
      navigate(`/invitation/callback?token=${token}&role=${userRole}&from_manual=true`);

    } catch (err: any) {
      setError(err.message || 'Error creating account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!token) return;
    
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/invitation/callback?token=${token}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) {
        throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Error with Google sign in');
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Validating invitation...</span>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/auth')} 
              className="w-full"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to FleetNest!
            </h1>
            <p className="text-gray-600">
              {invitation?.role === 'driver' 
                ? `Has sido invitado a unirte como conductor a ${invitation?.companyName}`
                : `You've been invited to manage ${invitation?.companyName}`
              }
            </p>
          </div>

          {/* Features Overview - Adapt based on role */}
          {invitation?.role === 'driver' ? (
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center space-x-3">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold">Mis Cargas</h3>
                    <p className="text-sm text-gray-600">Ve y gestiona tus cargas asignadas</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center space-x-3">
                  <Shield className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="font-semibold">Pagos</h3>
                    <p className="text-sm text-gray-600">Consulta tus ingresos y deducciones</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                  <div>
                    <h3 className="font-semibold">Reportes</h3>
                    <p className="text-sm text-gray-600">Historial de viajes y ganancias</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center space-x-3">
                  <Building2 className="h-8 w-8 text-orange-600" />
                  <div>
                    <h3 className="font-semibold">Documentos</h3>
                    <p className="text-sm text-gray-600">Gestiona tus documentos de conductor</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center space-x-3">
                  <Building2 className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold">Company Management</h3>
                    <p className="text-sm text-gray-600">Manage your fleet operations</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center space-x-3">
                  <Users className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="font-semibold">Driver Management</h3>
                    <p className="text-sm text-gray-600">Add and manage drivers</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center space-x-3">
                  <Shield className="h-8 w-8 text-purple-600" />
                  <div>
                    <h3 className="font-semibold">Payment Tracking</h3>
                    <p className="text-sm text-gray-600">Track loads and payments</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="h-8 w-8 text-orange-600" />
                  <div>
                    <h3 className="font-semibold">Reporting</h3>
                    <p className="text-sm text-gray-600">Comprehensive reports</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Registration Form */}
          <Card>
            <CardHeader>
              <CardTitle>Crear Tu Cuenta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Google Sign In Option */}
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Elige cómo crear tu cuenta
                  </p>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  className="w-full h-12 google-button font-body font-medium border-2 hover:bg-muted/50 transition-colors"
                  disabled={submitting}
                >
                  <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Continuar con Google</span>
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      O crea cuenta manualmente
                    </span>
                  </div>
                </div>
              </div>

              {/* Manual Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nombre</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      required
                      disabled={submitting}
                      autoComplete="off"
                      data-form-type="other"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellido</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      required
                      disabled={submitting}
                      autoComplete="off"
                      data-form-type="other"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email de Invitación</Label>
                  <Input
                    type="email"
                    value={invitation?.email || ''}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-sm text-gray-500">
                    Este es el email con el que fuiste invitado
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    name="new-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    required
                    disabled={submitting}
                    minLength={6}
                    autoComplete="new-password"
                    data-form-type="other"
                  />
                  <p className="text-sm text-gray-500">
                    Debe tener al menos 6 caracteres
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                  <Input
                    id="confirmPassword"
                    name="confirm-password"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    required
                    disabled={submitting}
                    minLength={6}
                    autoComplete="new-password"
                    data-form-type="other"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando Cuenta...
                    </>
                  ) : (
                    'Crear Cuenta y Comenzar'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}