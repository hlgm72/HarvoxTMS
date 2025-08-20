import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { handleEmailInput } from '@/lib/textUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Mail, Lock, User, Building, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { supabase } from '@/integrations/supabase/client';
import { useFleetNotifications } from '@/components/notifications';
import { createTextHandlers } from '@/lib/textUtils';
const fleetNestLogo = '/lovable-uploads/ec4495b7-2147-4fca-93d5-3dbdafbef98a.png';

export default function Auth() {
  const { t, i18n } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useFleetNotifications();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  
  // New password reset states
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [tokenValidation, setTokenValidation] = useState<{
    isValid: boolean;
    userEmail: string;
    error?: string;
  } | null>(null);
  
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
    
    // Check for reset password token
    const token = searchParams.get('token');
    
    if (token) {
      setResetToken(token);
      setShowResetPassword(true);
      setShowForgotPassword(false);
      
      // Validate token
      const validateToken = async () => {
        try {
          const { data, error } = await supabase.rpc('validate_reset_token', {
            token_param: token
          });
          
          if (error) throw error;
          
          if (data && data.length > 0) {
            const tokenData = data[0];
            setTokenValidation({
              isValid: tokenData.is_valid,
              userEmail: tokenData.user_email,
              error: tokenData.is_valid ? undefined : 'Token inválido o expirado'
            });
          } else {
            setTokenValidation({
              isValid: false,
              userEmail: '',
              error: 'Token no encontrado'
            });
          }
        } catch (err: any) {
          console.error('Error validating token:', err);
          setTokenValidation({
            isValid: false,
            userEmail: '',
            error: 'Error al validar el token'
          });
        }
      };
      
      validateToken();
    }
  }, [searchParams]);

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

  // Create text handlers for each field type with autofill detection
  const emailHandlers = createTextHandlers(
    (value) => {
      setFormData(prev => ({ ...prev, email: value }));
      validateField('email', value);
      if (error) setError(null);
    },
    'email'
  );

  // Enhanced autofill detection specifically for Samsung Browser credentials
  const detectCredentialAutofill = () => {
    try {
      const emailInput = document.getElementById('email') as HTMLInputElement;
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      
      // Add safety checks for null elements
      if (!emailInput || !passwordInput) {
        return;
      }

      // Additional safety check for the value property
      if (!emailInput.hasOwnProperty('value') || !passwordInput.hasOwnProperty('value')) {
        return;
      }
      
      const emailValue = emailInput.value?.trim() || '';
      const passwordValue = passwordInput.value || '';
      let hasChanges = false;
      
      // Update form data if values changed
      if (emailValue && emailValue !== formData.email) {
        setFormData(prev => ({ ...prev, email: emailValue }));
        validateField('email', emailValue);
        hasChanges = true;
      }
      
      if (passwordValue && passwordValue !== formData.password) {
        setFormData(prev => ({ ...prev, password: passwordValue }));
        validateField('password', passwordValue);
        hasChanges = true;
      }
      
      if (hasChanges && error) {
        setError(null);
      }
    } catch (err) {
      console.log('🔍 Credential check error (safely handled):', err);
    }
  };

  // MutationObserver to detect DOM changes from autofill
  useEffect(() => {
    if (!mounted) return;

    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    
    if (!emailInput || !passwordInput) return;

    // Create mutation observer for value changes
    const observer = new MutationObserver((mutations) => {
      let needsCheck = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'value' || mutation.attributeName === 'class')) {
          needsCheck = true;
        }
      });
      
      if (needsCheck) {
        setTimeout(detectCredentialAutofill, 50);
      }
    });

    // Observe both inputs for attribute changes
    observer.observe(emailInput, { 
      attributes: true, 
      attributeFilter: ['value', 'class'] 
    });
    observer.observe(passwordInput, { 
      attributes: true, 
      attributeFilter: ['value', 'class'] 
    });

    return () => observer.disconnect();
  }, [mounted]); // Solo depender de mounted, no de formData

  const handleEmailAutofill = (e: React.FocusEvent<HTMLInputElement>) => {
    const checkValue = () => {
      if (!e.target) return;
      const emailValue = e.target.value?.trim() || '';
      if (emailValue && emailValue !== formData.email) {
        setFormData(prev => ({ ...prev, email: emailValue }));
        validateField('email', emailValue);
        if (error) setError(null);
      }
      // Always check for credential autofill
      detectCredentialAutofill();
    };
    
    // Reduce de 6 checks a solo 2 para evitar bucle infinito
    checkValue();
    setTimeout(checkValue, 100);
  };

  // Input event handler for Samsung Browser
  const handleEmailInputEvent = (e: React.FormEvent<HTMLInputElement>) => {
    if (!e.currentTarget) return;
    const emailValue = e.currentTarget.value?.trim() || '';
    if (emailValue !== formData.email) {
      setFormData(prev => ({ ...prev, email: emailValue }));
      validateField('email', emailValue);
      if (error) setError(null);
    }
    // Check if both fields were filled (credential autofill)
    setTimeout(detectCredentialAutofill, 50);
  };

  // Password autofill detection - reducido para evitar bucle infinito
  const handlePasswordFocus = () => {
    setTimeout(detectCredentialAutofill, 50);
    setTimeout(detectCredentialAutofill, 200);
  };

  // Enhanced periodic check for Samsung Browser (reduced frequency)
  useEffect(() => {
    if (!mounted) return;
    
    let checkCount = 0;
    const maxChecks = 20; // Stop after 10 seconds (20 * 500ms)
    
    const interval = setInterval(() => {
      checkCount++;
      
      // Only check if we haven't reached max attempts
      if (checkCount <= maxChecks) {
        detectCredentialAutofill();
      }
      
      // Stop the interval after max checks or if form has data
      if (checkCount >= maxChecks || (formData.email && formData.password)) {
        clearInterval(interval);
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [mounted]); // Remove dependencies to prevent restart

  const firstNameHandlers = createTextHandlers((value) => {
    setFormData(prev => ({ ...prev, firstName: value }));
    validateField('firstName', value);
    if (error) setError(null);
  });

  const lastNameHandlers = createTextHandlers((value) => {
    setFormData(prev => ({ ...prev, lastName: value }));
    validateField('lastName', value);
    if (error) setError(null);
  });

  const companyNameHandlers = createTextHandlers((value) => {
    setFormData(prev => ({ ...prev, companyName: value }));
    validateField('companyName', value);
    if (error) setError(null);
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
    if (error) setError(null);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!resetEmail || !/\S+@\S+\.\S+/.test(resetEmail)) {
        setError(t('auth:validation.email_invalid'));
        setLoading(false);
        return;
      }

      // Usar directamente nuestra función personalizada con Resend (igual que las invitaciones)
      const { error: customError } = await supabase.functions.invoke('send-reset-email', {
        body: {
          email: resetEmail,
          lang: i18n.language
        }
      });

      if (customError) {
        console.error('Error sending reset email:', customError);
        throw new Error(customError.message || 'Error al enviar el email');
      }

      setResetSuccess(true);
      showSuccess(
        t('auth:forgot_password.success_message'),
        t('auth:forgot_password.check_email')
      );
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.message.includes('user_not_found')) {
        setError(t('auth:errors.reset_email_not_found'));
      } else {
        setError(err.message || t('auth:errors.unknown_error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check token validation first
      if (!tokenValidation?.isValid) {
        setError(tokenValidation?.error || 'Token inválido');
        setLoading(false);
        return;
      }

      if (!newPassword || newPassword.length < 8) {
        setError('La contraseña debe tener al menos 8 caracteres');
        setLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError('Las contraseñas no coinciden');
        setLoading(false);
        return;
      }

      // Use our secure password reset function
      const { data: resetResult, error: resetError } = await supabase.functions.invoke('reset-password', {
        body: {
          token: resetToken,
          newPassword: newPassword
        }
      });

      if (resetError) {
        console.error('Error calling reset function:', resetError);
        setError('Error al procesar el reset de contraseña');
        setLoading(false);
        return;
      }

      // Parse the result
      const result = resetResult as { success: boolean; message?: string; error?: string };
      
      if (!result?.success) {
        setError(result?.error || 'Error al cambiar la contraseña');
        setLoading(false);
        return;
      }

      showSuccess(
        'Contraseña actualizada',
        'Tu contraseña ha sido actualizada exitosamente'
      );

      // Clear the form and redirect to login
      setShowResetPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      setResetToken('');
      setTokenValidation(null);
      navigate('/auth');
      
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Error al procesar el reset de contraseña');
    } finally {
      setLoading(false);
    }
  };

  // Handler for password (no trimming on change, only validation)

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      // Clean up any existing auth state first
      localStorage.removeItem('supabase.auth.token');
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });

      const currentOrigin = window.location.origin;
      console.log('Current origin for Google OAuth:', currentOrigin);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${currentOrigin}/auth/callback`,
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
      // Log form data being sent
      console.log('Login attempt with data:', {
        email: formData.email,
        emailLength: formData.email.length,
        hasSpaces: formData.email.includes(' '),
        trimmedEmail: formData.email.trim(),
        password: '***hidden***'
      });

      if (isLogin) {
        // Sign in existing user
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email.trim(),
          password: formData.password,
        });

        if (error) {
          console.error('Supabase auth error:', error);
          throw error;
        }

        if (data.user) {
          console.log('User logged in successfully:', data.user.id);
          
          // Store success message for the dashboard to show
          localStorage.setItem('loginSuccess', 'true');
          
          // Navigate to index which will handle role-based redirects
          console.log('Login successful, navigating to home...');
          navigate('/');
        }
      } else {
        // Sign up new user
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              first_name: formData.firstName,
              last_name: formData.lastName,
              company_name: formData.companyName,
            }
          }
        });

        if (error) throw error;

        if (data.user) {
          showSuccess(
            "¡Cuenta creada exitosamente!",
            "Por favor revisa tu email para verificar tu cuenta"
          );
          // Don't navigate yet - wait for email verification
        }
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      showError(
        "Error de autenticación",
        err.message || "Ocurrió un error durante la autenticación"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen auth-background flex relative overflow-hidden">
      {/* Floating Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-20 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-10 w-16 h-16 bg-white/10 rounded-full blur-lg animate-pulse delay-500"></div>
      </div>
      
      {/* Hero Section - Left Side */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-16 relative z-10">
        <div className="max-w-lg animate-fade-in">
          {/* Logo and Branding */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="flex items-center space-x-4 p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
              <img 
                src={fleetNestLogo}
                alt="FleetNest Logo" 
                className="h-16 w-16 object-contain"
              />
              <span className="text-3xl font-heading font-bold text-white drop-shadow-lg">{t('common:app.name')}</span>
            </div>
          </div>
          
          {/* Hero Content */}
          <h1 className="text-5xl xl:text-6xl font-heading font-bold text-white mb-6 leading-tight">
            {t('common:app.tagline')}
          </h1>
          
          <p className="text-xl text-white/90 font-body mb-8 leading-relaxed">
            {t('auth:hero.description')}
          </p>
          
          {/* Features List */}
          <div className="space-y-4 mb-8">
            {[
              { icon: "🚛", text: t('auth:hero.features.gps_tracking') },
              { icon: "📊", text: t('auth:hero.features.dashboard') },
              { icon: "👥", text: t('auth:hero.features.driver_management') },
              { icon: "⚡", text: t('auth:hero.features.route_optimization') }
            ].map((feature, index) => (
              <div key={index} className="flex items-center space-x-3 animate-fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                <span className="text-2xl">{feature.icon}</span>
                <span className="text-white/90 font-body">{feature.text}</span>
              </div>
            ))}
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 p-6 bg-white/10 backdrop-blur-sm rounded-2xl">
            <div className="text-center">
              <div className="text-3xl font-heading font-bold text-white">500+</div>
              <div className="text-sm text-white/70 font-body">{t('auth:hero.stats.companies')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-heading font-bold text-white">10K+</div>
              <div className="text-sm text-white/70 font-body">{t('auth:hero.stats.vehicles')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-heading font-bold text-white">99.9%</div>
              <div className="text-sm text-white/70 font-body">{t('auth:hero.stats.uptime')}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Auth Form - Right Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-8 relative z-10">
        {/* Back to landing - Mobile Only */}
        <div className="absolute top-4 left-4 lg:hidden animate-fade-in">
          <Link to="/" className="inline-flex items-center text-white/80 hover:text-white transition-all duration-300">
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="font-body text-sm">{t('common:actions.back_home')}</span>
          </Link>
        </div>
        
        {/* Language Switcher - Mobile Only */}
        <div className="absolute top-4 right-4 lg:hidden">
          <LanguageSwitcher />
        </div>
        
        <div className="w-full max-w-md mt-16 lg:mt-0">

        <Card className="w-full auth-card animate-scale-in">
          <CardHeader className="text-center pb-6">
            {/* Logo for Mobile */}
            <div className="flex justify-center mb-6 lg:hidden">
              <div className="flex items-center space-x-3 p-4 rounded-2xl bg-gradient-primary shadow-glow">
                <img 
                  src={fleetNestLogo}
                  alt="FleetNest Logo" 
                  className="h-12 w-12 object-contain"
                />
                <span className="text-xl font-heading font-bold text-white drop-shadow-lg">{t('common:app.name')}</span>
              </div>
            </div>
            
            <CardTitle className="text-2xl lg:text-3xl font-heading font-bold text-foreground mb-2">
              {showResetPassword ? 'Nueva Contraseña' : 
               showForgotPassword ? t('auth:forgot_password.title') : 
               (isLogin ? t('auth:title.login') : t('auth:title.signup'))}
            </CardTitle>
             <CardDescription className="font-body text-muted-foreground">
               {showResetPassword 
                 ? `Establece tu nueva contraseña para ${tokenValidation?.userEmail || 'tu cuenta'}`
                : showForgotPassword 
                  ? t('auth:forgot_password.description')
                  : (isLogin 
                    ? t('auth:description.login')
                    : t('auth:description.signup')
                  )
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-0">
            {/* Forgot Password Form */}
            {showForgotPassword && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resetEmail" className="font-body font-medium text-foreground">
                    {t('auth:forgot_password.email_label')}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="resetEmail"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => {
                        setResetEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder={t('auth:form.email_placeholder')}
                      className="auth-input pl-10 font-body"
                      required
                      disabled={loading || resetSuccess}
                    />
                  </div>
                </div>
                
                {error && (
                  <Alert variant="destructive" className="animate-fade-in">
                    <AlertDescription className="font-body">{error}</AlertDescription>
                  </Alert>
                )}
                
                {!resetSuccess && (
                  <div className="flex gap-2">
                     <Button
                       type="submit"
                       className="flex-1 font-body font-medium"
                       disabled={loading || !resetEmail}
                     >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('auth:forgot_password.sending')}
                        </>
                      ) : (
                        t('auth:forgot_password.send_reset')
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setResetEmail('');
                        setError(null);
                        setResetSuccess(false);
                      }}
                      className="font-body"
                      disabled={loading}
                    >
                      {t('auth:forgot_password.back_to_login')}
                    </Button>
                  </div>
                )}
                
                {resetSuccess && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmail('');
                      setError(null);
                      setResetSuccess(false);
                    }}
                    className="w-full font-body"
                  >
                    {t('auth:forgot_password.back_to_login')}
                  </Button>
                )}
              </form>
            )}

            {/* Reset Password Form */}
            {showResetPassword && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="font-body font-medium text-foreground">
                    Nueva Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="Ingresa tu nueva contraseña"
                      className="auth-input pl-10 font-body"
                      required
                      disabled={loading}
                      minLength={8}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="font-body font-medium text-foreground">
                    Confirmar Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="Confirma tu nueva contraseña"
                      className="auth-input pl-10 font-body"
                      required
                      disabled={loading}
                      minLength={8}
                    />
                  </div>
                </div>
                
                {error && (
                  <Alert variant="destructive" className="animate-fade-in">
                    <AlertDescription className="font-body">{error}</AlertDescription>
                  </Alert>
                )}
                
                 <Button
                   type="submit"
                   className="w-full font-body font-medium"
                   disabled={loading || !newPassword || !confirmPassword}
                 >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Actualizando contraseña...
                    </>
                  ) : (
                    'Actualizar Contraseña'
                  )}
                </Button>
              </form>
            )}

            {/* Main Login/Signup Form */}
            {!showForgotPassword && (
              <>
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
                              {...firstNameHandlers}
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
                              {...lastNameHandlers}
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
                            {...companyNameHandlers}
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
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          const cleanValue = inputValue.replace(/\s/g, '');
                          setFormData(prev => ({ ...prev, email: cleanValue }));
                          validateField('email', cleanValue);
                          if (error) setError(null);
                        }}
                        onInput={handleEmailInputEvent}
                        onKeyPress={(e) => {
                          // Prevent spaces from being typed
                          if (e.key === ' ') {
                            e.preventDefault();
                          }
                        }}
                        onBlur={(e) => {
                          const trimmedValue = handleEmailInput(e.target.value);
                          setFormData(prev => ({ ...prev, email: trimmedValue }));
                          validateField('email', trimmedValue);
                        }}
                        onFocus={handleEmailAutofill}
                        onAnimationStart={(e) => {
                          // Detect Chrome autofill animation
                          if (e.animationName === 'onAutoFillStart') {
                            setTimeout(() => {
                              if (!e.currentTarget) return;
                              const emailValue = e.currentTarget.value || '';
                              if (emailValue && emailValue !== formData.email) {
                                setFormData(prev => ({ ...prev, email: emailValue }));
                                validateField('email', emailValue);
                                if (error) setError(null);
                              }
                            }, 100);
                          }
                        }}
                        placeholder={t('auth:form.email_placeholder')}
                        className={`auth-input pl-10 font-body ${fieldErrors.email ? 'border-destructive' : ''}`}
                        required
                        disabled={loading}
                        autoComplete="email"
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
                        onFocus={handlePasswordFocus}
                        placeholder={isLogin ? t('auth:form.password_placeholder_login') : t('auth:form.password_placeholder_signup')}
                        className={`auth-input pl-10 pr-10 font-body ${fieldErrors.password ? 'border-destructive' : ''}`}
                        required
                        disabled={loading}
                        minLength={isLogin ? undefined : 8}
                        autoComplete="current-password"
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
                    
                    {/* Forgot Password Link - Only show in login mode */}
                    {isLogin && (
                      <div className="text-right">
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword(true)}
                          className="text-sm font-body text-primary hover:text-primary/80 transition-colors"
                          disabled={loading}
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      </div>
                    )}
                  </div>

                  {error && (
                    <Alert variant="destructive" className="animate-fade-in">
                      <AlertDescription className="font-body">{error}</AlertDescription>
                    </Alert>
                  )}

                   <Button 
                     type="submit" 
                     className="w-full h-12 font-body font-medium text-base" 
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
                     onClick={handleGoogleSignIn}
                     className="w-full h-12 google-button font-body font-medium border-2 hover:bg-muted/50 transition-colors"
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
              </>
            )}
          </CardContent>
        </Card>

        {/* Legal Text */}
        <div className="mt-6 text-center text-xs text-white/60 animate-fade-in">
          <p className="font-body">
            {t('common:legal.legal_acceptance')}{' '}
            <Link to="/terms-of-service" className="text-white/80 hover:text-white underline transition-colors">
              {t('common:legal.terms_of_service')}
            </Link>{' '}
            y{' '}
            <Link to="/privacy-policy" className="text-white/80 hover:text-white underline transition-colors">
              {t('common:legal.privacy_policy')}
            </Link>
          </p>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden lg:flex justify-between items-center mt-8 animate-fade-in">
          <Link to="/" className="inline-flex items-center text-white/80 hover:text-white transition-all duration-300">
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="font-body">{t('common:actions.back_home')}</span>
          </Link>
          <LanguageSwitcher />
        </div>
        
        </div>
      </div>
    </div>
  );
}