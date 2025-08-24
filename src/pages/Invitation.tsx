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
import { AppLogo } from '@/components/ui/AppLogo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

export default function Invitation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useFleetNotifications();
  const { t } = useTranslation('invitation');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [userAlreadyAuth, setUserAlreadyAuth] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    console.log('Invitation page mounted with token:', token);
    console.log('Current URL:', window.location.href);
    console.log('Referrer:', document.referrer);
    
    // Check if user is already authenticated
    const checkAuthStatus = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('🚨 User already authenticated:', session.user.email);
          setUserAlreadyAuth(true);
          setLoading(false);
          return; // Don't proceed with invitation validation
        }
        
        // Only validate invitation if user is not authenticated
        if (token) {
          console.log('Starting invitation validation...');
          validateInvitation();
        }
      } catch (err) {
        console.error('Error checking auth status:', err);
        if (token) {
          validateInvitation();
        }
      }
    };
    
    checkAuthStatus();
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
      if (!token) {
        setError('No invitation token provided');
        return;
      }

      console.log('🔍 About to call validate-invitation function...');
      
      // Call the validate-invitation edge function
      const { data: result, error: functionError } = await supabase.functions.invoke('validate-invitation', {
        body: { token }
      });

      console.log('📡 Function response:', { result, functionError });

      if (functionError) {
        console.error('❌ Function error:', functionError);
        throw new Error(functionError.message || 'Error validating invitation');
      }

      if (!result) {
        console.error('❌ No result from function');
        throw new Error('No response from validation function');
      }

      if (!result.success) {
        console.error('❌ Function returned error:', result.error);
        throw new Error(result.error || 'Invalid invitation');
      }

      console.log('✅ Invitation validation successful:', result.invitation);

      // Set the real invitation data
      const invitationData = {
        ...result.invitation,
        first_name: result.invitation.firstName,
        last_name: result.invitation.lastName,
        is_valid: result.invitation.isValid
      };

      setInvitation(invitationData);
      
      // Pre-fill form with invitation data if available
      if (result.invitation.firstName || result.invitation.lastName) {
        setFormData(prev => ({
          ...prev,
          firstName: result.invitation.firstName || '',
          lastName: result.invitation.lastName || ''
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
      setError(t('form.errors.passwordMismatch'));
      return;
    }

    if (formData.password.length < 6) {
      setError(t('form.errors.passwordTooShort'));
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
        throw new Error(t('form.errors.signInError', { message: signInError.message }));
      }

      // Redirect to processing page with invitation token and role
      const userRole = result.user?.role || invitation.role;
      navigate(`/invitation/callback?token=${token}&role=${userRole}&from_manual=true`);

    } catch (err: any) {
      setError(err.message || t('form.errors.accountCreationError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!token) return;
    
    // Prevent Google OAuth if user is already authenticated
    if (userAlreadyAuth) {
      showError('Error', t('authStatus.activeSessionDescription'));
      return;
    }
    
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

  const handleSignOut = async () => {
    try {
      setSubmitting(true);
      await supabase.auth.signOut({ scope: 'global' });
      
      // Clean up local storage
      localStorage.clear();
      
      // Reload page to ensure clean state
      window.location.reload();
    } catch (err: any) {
      console.error('Error signing out:', err);
      showError('Error', 'Error al cerrar sesión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  // Show user already authenticated message
  if (userAlreadyAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-orange-600">{t('authStatus.activeSessionTitle')}</CardTitle>
            <CardDescription>
              {t('authStatus.activeSessionDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleSignOut} 
              className="w-full"
              disabled={submitting}
            >
              {submitting ? t('authStatus.signingOut') : t('authStatus.signOut')}
            </Button>
            <Button 
              onClick={() => navigate('/dashboard')} 
              variant="outline"
              className="w-full"
            >
              {t('authStatus.goToDashboard')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{t('validation.loading')}</span>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">{t('validation.invalid')}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/auth')} 
              className="w-full"
            >
              {t('validation.goToLogin')}
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
          {/* Header with Language Switcher */}
          <div className="flex justify-end mb-4">
            <LanguageSwitcher />
          </div>
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <AppLogo width={80} height={80} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('welcome.title')}
            </h1>
            <p className="text-gray-600">
              {invitation?.role === 'driver' 
                ? t('welcome.subtitle.driver', { companyName: invitation?.companyName })
                : t('welcome.subtitle.manager', { companyName: invitation?.companyName })
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
                    <h3 className="font-semibold">{t('features.driver.loads.title')}</h3>
                    <p className="text-sm text-gray-600">{t('features.driver.loads.description')}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center space-x-3">
                  <Shield className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="font-semibold">{t('features.driver.payments.title')}</h3>
                    <p className="text-sm text-gray-600">{t('features.driver.payments.description')}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                  <div>
                    <h3 className="font-semibold">{t('features.driver.reports.title')}</h3>
                    <p className="text-sm text-gray-600">{t('features.driver.reports.description')}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center space-x-3">
                  <Building2 className="h-8 w-8 text-orange-600" />
                  <div>
                    <h3 className="font-semibold">{t('features.driver.documents.title')}</h3>
                    <p className="text-sm text-gray-600">{t('features.driver.documents.description')}</p>
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
                    <h3 className="font-semibold">{t('features.manager.company.title')}</h3>
                    <p className="text-sm text-gray-600">{t('features.manager.company.description')}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center space-x-3">
                  <Users className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="font-semibold">{t('features.manager.drivers.title')}</h3>
                    <p className="text-sm text-gray-600">{t('features.manager.drivers.description')}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center space-x-3">
                  <Shield className="h-8 w-8 text-purple-600" />
                  <div>
                    <h3 className="font-semibold">{t('features.manager.payments.title')}</h3>
                    <p className="text-sm text-gray-600">{t('features.manager.payments.description')}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="h-8 w-8 text-orange-600" />
                  <div>
                    <h3 className="font-semibold">{t('features.manager.reporting.title')}</h3>
                    <p className="text-sm text-gray-600">{t('features.manager.reporting.description')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Registration Form */}
          <Card>
            <CardHeader>
              <CardTitle>{t('form.title')}</CardTitle>
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
                    {t('form.subtitle')}
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
                  <span>{t('form.googleButton')}</span>
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      {t('form.orText')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Manual Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">{t('form.fields.firstName')}</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      required
                      disabled={submitting}
                      autoComplete="given-name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">{t('form.fields.lastName')}</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      required
                      disabled={submitting}
                      autoComplete="family-name"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">{t('form.fields.invitationEmail')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={invitation?.email || ''}
                    disabled
                    className="mt-1 bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('form.fields.invitationEmailDescription')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="password">{t('form.fields.password')}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    required
                    disabled={submitting}
                    autoComplete="new-password"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('form.fields.passwordDescription')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="confirmPassword">{t('form.fields.confirmPassword')}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    required
                    disabled={submitting}
                    autoComplete="new-password"
                    className="mt-1"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    t('form.submit')
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