import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Truck, ArrowLeft, Mail, Lock, User, Building, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Auth() {
  const { t } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    companyName: ''
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  const validateField = (field: string, value: string) => {
    const errors = { ...fieldErrors };
    
    switch (field) {
      case 'email':
        if (!value) {
          errors.email = t('auth:validation.email_required');
        } else if (!/\S+@\S+\.\S+/.test(value)) {
          errors.email = t('auth:validation.email_invalid');
        } else {
          delete errors.email;
        }
        break;
      case 'password':
        if (!value) {
          errors.password = t('auth:validation.password_required');
        } else if (!isLogin && value.length < 8) {
          errors.password = t('auth:validation.password_min_length');
        } else {
          delete errors.password;
        }
        break;
      case 'firstName':
        if (!isLogin && !value) {
          errors.firstName = t('auth:validation.first_name_required');
        } else {
          delete errors.firstName;
        }
        break;
      case 'lastName':
        if (!isLogin && !value) {
          errors.lastName = t('auth:validation.last_name_required');
        } else {
          delete errors.lastName;
        }
        break;
      case 'companyName':
        if (!isLogin && !value) {
          errors.companyName = t('auth:validation.company_name_required');
        } else {
          delete errors.companyName;
        }
        break;
    }
    
    setFieldErrors(errors);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
    if (error) setError(null);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (error) throw error;
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(err.message || 'Error signing in with Google');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // Sign in existing user
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        if (data.user) {
          console.log('User logged in:', data.user.id);
          
          // Check user role to determine redirect
          const { data: roleData, error: roleError } = await supabase
            .from('user_company_roles')
            .select('role')
            .eq('user_id', data.user.id)
            .eq('is_active', true)
            .single();

          console.log('Role query result:', { roleData, roleError });

          toast({
            title: "Welcome back!",
            description: "You have been successfully logged in.",
          });

          // Redirect based on role
          if (roleData?.role === 'superadmin') {
            console.log('Redirecting to superadmin dashboard');
            navigate('/superadmin');
          } else {
            console.log('Redirecting to setup page');
            navigate('/setup');
          }
        }
      } else {
        // Sign up new user
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/setup`,
            data: {
              first_name: formData.firstName,
              last_name: formData.lastName,
              company_name: formData.companyName,
            }
          }
        });

        if (error) throw error;

        if (data.user) {
          toast({
            title: "Account created!",
            description: "Please check your email to verify your account.",
          });
          // Don't navigate yet - wait for email verification
        }
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setError(err.message || 'Authentication error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen auth-gradient flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-20 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-10 w-16 h-16 bg-white/10 rounded-full blur-lg animate-pulse delay-500"></div>
      </div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Back to landing */}
        <div className="mb-8 flex justify-between items-center animate-fade-in">
          <Link to="/" className="inline-flex items-center text-white/80 hover:text-white transition-all duration-300 hover:transform hover:translate-x-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="font-body">{t('common:actions.back_home')}</span>
          </Link>
          <LanguageSwitcher />
        </div>

        <Card className="w-full auth-card animate-scale-in">
          <CardHeader className="text-center pb-8">
            <div className="flex justify-center mb-6">
              <div className="flex items-center space-x-3 p-3 rounded-2xl bg-gradient-primary">
                <Truck className="h-10 w-10 text-white" />
                <span className="text-2xl font-heading font-bold text-white">{t('common:app.name')}</span>
              </div>
            </div>
            <CardTitle className="text-3xl font-heading font-bold text-foreground mb-2">
              {isLogin ? t('auth:title.login') : t('auth:title.signup')}
            </CardTitle>
            <CardDescription className="font-body text-muted-foreground text-base">
              {isLogin 
                ? t('auth:description.login')
                : t('auth:description.signup')
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="font-body font-medium text-foreground">
                        {t('auth:form.first_name')}
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          className={`auth-input pl-10 font-body ${fieldErrors.firstName ? 'border-destructive' : ''}`}
                          required={!isLogin}
                          disabled={loading}
                        />
                      </div>
                      {fieldErrors.firstName && (
                        <p className="text-sm text-destructive font-body">{fieldErrors.firstName}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="font-body font-medium text-foreground">
                        {t('auth:form.last_name')}
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          className={`auth-input pl-10 font-body ${fieldErrors.lastName ? 'border-destructive' : ''}`}
                          required={!isLogin}
                          disabled={loading}
                        />
                      </div>
                      {fieldErrors.lastName && (
                        <p className="text-sm text-destructive font-body">{fieldErrors.lastName}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="font-body font-medium text-foreground">
                      {t('auth:form.company_name')}
                    </Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => handleInputChange('companyName', e.target.value)}
                        placeholder={t('auth:form.company_placeholder')}
                        className={`auth-input pl-10 font-body ${fieldErrors.companyName ? 'border-destructive' : ''}`}
                        required={!isLogin}
                        disabled={loading}
                      />
                    </div>
                    {fieldErrors.companyName && (
                      <p className="text-sm text-destructive font-body">{fieldErrors.companyName}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="font-body font-medium text-foreground">
                  {t('auth:form.email')}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder={t('auth:form.email_placeholder')}
                    className={`auth-input pl-10 font-body ${fieldErrors.email ? 'border-destructive' : ''}`}
                    required
                    disabled={loading}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-sm text-destructive font-body">{fieldErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="font-body font-medium text-foreground">
                  {t('auth:form.password')}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder={isLogin ? t('auth:form.password_placeholder_login') : t('auth:form.password_placeholder_signup')}
                    className={`auth-input pl-10 pr-10 font-body ${fieldErrors.password ? 'border-destructive' : ''}`}
                    required
                    disabled={loading}
                    minLength={isLogin ? undefined : 8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-sm text-destructive font-body">{fieldErrors.password}</p>
                )}
              </div>

              {error && (
                <Alert variant="destructive" className="animate-fade-in">
                  <AlertDescription className="font-body">{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 font-body font-medium text-base bg-gradient-primary hover:shadow-glow transition-all duration-300 hover:transform hover:translate-y-[-1px]" 
                disabled={loading || Object.keys(fieldErrors).length > 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <span>{isLogin ? t('auth:buttons.logging_in') : t('auth:buttons.creating_account')}</span>
                  </>
                ) : (
                  <span>{isLogin ? t('auth:buttons.login') : t('auth:buttons.signup')}</span>
                )}
              </Button>

              {/* Google OAuth Separator */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-card px-4 text-muted-foreground font-body">{t('auth:oauth.or_continue')}</span>
                </div>
              </div>

              {/* Google Sign In Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 google-button font-body font-medium border-2 hover:border-primary/50"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>{t('auth:oauth.google_continue')}</span>
              </Button>
            </form>

            <div className="mt-8 text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setFieldErrors({});
                  setFormData({
                    email: '',
                    password: '',
                    firstName: '',
                    lastName: '',
                    companyName: ''
                  });
                }}
                className="text-sm font-body text-muted-foreground hover:text-primary transition-all duration-300 hover:transform hover:scale-105"
                disabled={loading}
              >
                {isLogin 
                  ? t('auth:toggle.need_account')
                  : t('auth:toggle.have_account')
                }
              </button>
            </div>

            {!isLogin && (
              <div className="mt-6 p-4 bg-gradient-subtle rounded-xl border border-primary/10 animate-fade-in">
                <p className="text-sm font-body text-primary/80">
                  <strong className="font-heading font-semibold">{t('auth:features.included')}</strong><br />
                  <span className="text-muted-foreground">{t('auth:features.description')}</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-white/70 animate-fade-in">
          <p className="font-body">
            {t('common:legal.legal_acceptance')}{' '}
            <a href="#" className="text-white hover:text-white/90 underline transition-colors">
              {t('common:legal.terms_of_service')}
            </a>{' '}
            y{' '}
            <a href="#" className="text-white hover:text-white/90 underline transition-colors">
              {t('common:legal.privacy_policy')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}