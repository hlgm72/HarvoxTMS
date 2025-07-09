import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Truck, ArrowLeft } from 'lucide-react';
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
      if (isLogin) {
        // Sign in existing user
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        if (data.user) {
          // Check user role to determine redirect
          const { data: roleData } = await supabase
            .from('user_company_roles')
            .select('role')
            .eq('user_id', data.user.id)
            .eq('is_active', true)
            .single();

          toast({
            title: "Welcome back!",
            description: "You have been successfully logged in.",
          });

          // Redirect based on role
          if (roleData?.role === 'superadmin') {
            navigate('/superadmin');
          } else {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to landing */}
        <div className="mb-6 flex justify-between items-center">
          <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common:actions.back_home')}
          </Link>
          <LanguageSwitcher />
        </div>

        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex items-center space-x-2">
                <Truck className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold text-primary">{t('common:app.name')}</span>
              </div>
            </div>
            <CardTitle className="text-2xl">
              {isLogin ? t('auth:title.login') : t('auth:title.signup')}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? t('auth:description.login')
                : t('auth:description.signup')
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">{t('auth:form.first_name')}</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        required={!isLogin}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">{t('auth:form.last_name')}</Label>
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
                    <Label htmlFor="companyName">{t('auth:form.company_name')}</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      placeholder={t('auth:form.company_placeholder')}
                      required={!isLogin}
                      disabled={loading}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t('auth:form.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder={t('auth:form.email_placeholder')}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('auth:form.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder={isLogin ? t('auth:form.password_placeholder_login') : t('auth:form.password_placeholder_signup')}
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
                    {isLogin ? t('auth:buttons.logging_in') : t('auth:buttons.creating_account')}
                  </>
                ) : (
                  isLogin ? t('auth:buttons.login') : t('auth:buttons.signup')
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
                  ? t('auth:toggle.need_account')
                  : t('auth:toggle.have_account')
                }
              </button>
            </div>

            {!isLogin && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>{t('auth:features.included')}</strong> {t('auth:features.description')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            {t('common:legal.legal_acceptance')}{' '}
            <a href="#" className="text-primary hover:underline">
              {t('common:legal.terms_of_service')}
            </a>{' '}
            y{' '}
            <a href="#" className="text-primary hover:underline">
              {t('common:legal.privacy_policy')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}