import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Settings as SettingsIcon, Building, User, Moon, Sun, Bell, Shield, 
  Globe, Palette, Monitor, Database, Save, RotateCcw, KeyRound
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFleetNotifications } from '@/components/notifications';
import { CompanySettingsForm } from '@/components/companies/settings/CompanySettingsForm';
import { SelfRoleManager } from '@/components/owner/SelfRoleManager';
import { PageToolbar } from '@/components/layout/PageToolbar';
import { Company } from '@/types/company';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { PreferencesForm } from '@/components/profile/PreferencesForm';
import { OnboardingPreferencesForm } from '@/components/profile/OnboardingPreferencesForm';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';

// Schema para contraseña - will be created dynamically with translations
const createPasswordSchema = (t: any) => z.object({
  currentPassword: z.string().min(1, t('password.required')),
  newPassword: z.string().min(6, t('password.min_length')),
  confirmPassword: z.string().min(1, t('password.confirm_required')),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: t('password.no_match'),
  path: ["confirmPassword"],
});

type PasswordFormData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function Settings() {
  const { t } = useTranslation('settings');
  const { user, userRole } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const { profile, loading: profileLoading, refreshProfile } = useUserProfile();
  const { preferences } = useUserPreferences();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState<Company | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  

  // Create password schema with translations
  const passwordSchema = createPasswordSchema(t);

  // Form para contraseña
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (user && userRole?.company_id) {
      fetchCompanyData();
    }
  }, [user, userRole]);

  const fetchCompanyData = async () => {
    if (!userRole?.company_id) return;
    
    try {
      // Use secure RPC function for company data
      const { data, error } = await supabase
        .rpc('get_companies_financial_data', {
          target_company_id: userRole.company_id
        })
        .then(result => ({
          data: result.data?.[0] || null,
          error: result.error
        }));

      if (error) throw error;
      setCompanyInfo(data);
    } catch (error) {
      console.error('Error fetching company data:', error);
      showError(
        t('error.title'),
        t('error.company_load_failed')
      );
    } finally {
      setLoading(false);
    }
  };

  const onSubmitPassword = async (data: PasswordFormData) => {
    setChangingPassword(true);
    try {
      // First verify current password by trying to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: data.currentPassword,
      });

      if (signInError) {
        throw new Error(t('password.current_incorrect'));
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (updateError) throw updateError;

      showSuccess(
        t('password.updated_title'),
        t('password.updated_message')
      );

      passwordForm.reset();
    } catch (error: any) {
      showError(
        t('password.error_title'),
        error.message || t('password.error_message')
      );
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="p-2 md:p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">{t('loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 md:p-4">
      <PageToolbar 
        icon={SettingsIcon}
        title={t('title')}
        subtitle={t('subtitle')}
      />
      <div className="min-h-screen bg-gradient-subtle">
        {/* Content */}
        <div className="space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid gap-1 p-1 bg-muted/30 rounded-lg grid-cols-3 lg:grid-cols-5 min-h-[60px]">
            <TabsTrigger 
              value="profile"
              className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 bg-white/90 text-muted-foreground hover:bg-white border border-gray-200/50 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=active]:border-secondary transition-all duration-200"
            >
              <User className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('tabs.profile')}</span>
              <span className="sm:hidden">{t('tabs.profile')}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="company"
              className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 bg-white/90 text-muted-foreground hover:bg-white border border-gray-200/50 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=active]:border-secondary transition-all duration-200"
            >
              <Building className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('tabs.company')}</span>
              <span className="sm:hidden">{t('tabs.company')}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="system"
              className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 bg-white/90 text-muted-foreground hover:bg-white border border-gray-200/50 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=active]:border-secondary transition-all duration-200"
            >
              <Database className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('tabs.system')}</span>
              <span className="sm:hidden">{t('tabs.system')}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="interface"
              className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 bg-white/90 text-muted-foreground hover:bg-white border border-gray-200/50 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=active]:border-secondary transition-all duration-200"
            >
              <Palette className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('tabs.interface')}</span>
              <span className="sm:hidden">{t('tabs.interface')}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="notifications"
              className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 bg-white/90 text-muted-foreground hover:bg-white border border-gray-200/50 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=active]:border-secondary transition-all duration-200"
            >
              <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('tabs.notifications')}</span>
              <span className="sm:hidden">{t('tabs.notifications')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Mi Perfil */}
          <TabsContent value="profile" className="space-y-8">
            <div className="grid gap-8">
              {/* Self Role Manager - Only for Company Owners */}
              <div className="mb-8">
                <SelfRoleManager />
              </div>
              
              <div className="grid gap-8 md:grid-cols-3">
                {/* Profile Summary Card */}
                <Card className="md:col-span-1">
                  <CardHeader className="text-center pb-4">
                    <AvatarUpload 
                      currentAvatarUrl={profile?.avatar_url}
                      userName={`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()}
                      onAvatarUpdate={async (avatarUrl) => {
                        await refreshProfile();
                      }}
                    />
                    <CardTitle className="text-xl mt-4">{profile?.first_name} {profile?.last_name}</CardTitle>
                    <p className="text-muted-foreground">{user?.email}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-muted-foreground">{t('profile.phone')}:</span>
                        <span className="font-medium">{profile?.phone || t('profile.not_specified')}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-muted-foreground">{t('profile.language')}:</span>
                        <span className="font-medium">{preferences?.preferred_language === 'es' ? t('profile.spanish') : t('profile.english')}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-muted-foreground">{t('profile.timezone')}:</span>
                        <span className="font-medium">{preferences?.timezone || 'America/New_York'}</span>
                      </div>
                      {(profile?.street_address || profile?.zip_code) && (
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex flex-col gap-2">
                            <span className="text-muted-foreground font-medium">{t('profile.address')}:</span>
                            <div className="text-foreground text-sm leading-relaxed">
                              {profile?.street_address && (
                                <div className="mb-1">{profile.street_address}</div>
                              )}
                              {profile?.zip_code && (
                                <div>{profile.zip_code}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Profile Form with integrated tabs */}
                <Card className="md:col-span-2">
                  <CardContent className="p-6">
                    <ProfileForm showCancelButton={false} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Configuración de Empresa */}
          <TabsContent value="company">
            {companyInfo && (
              <CompanySettingsForm 
                company={companyInfo} 
                onUpdate={setCompanyInfo}
              />
            )}
          </TabsContent>

          {/* Configuración del Sistema */}
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  {t('system.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Configuraciones de seguridad */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <Shield className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">{t('system.security.title')}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('system.security.description')}
                    </p>
                    <Button variant="outline">
                      {t('system.security.configure')}
                    </Button>
                  </div>

                  {/* Configuraciones de integración */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <Globe className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">{t('system.integrations.title')}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('system.integrations.description')}
                    </p>
                    <Button variant="outline">
                      {t('system.integrations.manage')}
                    </Button>
                  </div>

                  {/* Próximamente */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">{t('system.coming_soon.title')}</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• {t('system.coming_soon.automatic_backups')}</li>
                      <li>• {t('system.coming_soon.audit_config')}</li>
                      <li>• {t('system.coming_soon.api_config')}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuración de Interfaz */}
          <TabsContent value="interface">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  {t('interface.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Tema */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <Monitor className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">{t('interface.theme.title')}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('interface.theme.description')}
                    </p>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <button className="p-4 border rounded-lg hover:border-primary transition-colors">
                        <Sun className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                        <p className="text-sm font-medium">{t('interface.theme.light')}</p>
                      </button>
                      <button className="p-4 border rounded-lg hover:border-primary transition-colors border-primary bg-primary/5">
                        <Moon className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                        <p className="text-sm font-medium">{t('interface.theme.dark')}</p>
                      </button>
                      <button className="p-4 border rounded-lg hover:border-primary transition-colors">
                        <Monitor className="h-6 w-6 mx-auto mb-2 text-gray-500" />
                        <p className="text-sm font-medium">{t('interface.theme.auto')}</p>
                      </button>
                    </div>
                  </div>

                  {/* Próximamente */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">{t('interface.coming_soon.title')}</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• {t('interface.coming_soon.color_customization')}</li>
                      <li>• {t('interface.coming_soon.dashboard_config')}</li>
                      <li>• {t('interface.coming_soon.custom_widgets')}</li>
                      <li>• {t('interface.coming_soon.language_localization')}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuración de Notificaciones */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  {t('notifications.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-3">{t('notifications.email.title')}</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('notifications.email.description')}
                    </p>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded" defaultChecked />
                        <span className="text-sm">{t('notifications.email.weekly_reports')}</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded" defaultChecked />
                        <span className="text-sm">{t('notifications.email.document_expiration')}</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded" defaultChecked />
                        <span className="text-sm">{t('notifications.email.new_loads')}</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">{t('notifications.email.maintenance_alerts')}</span>
                      </label>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-3">{t('notifications.push.title')}</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('notifications.push.description')}
                    </p>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded" defaultChecked />
                        <span className="text-sm">{t('notifications.push.emergency_alerts')}</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded" defaultChecked />
                        <span className="text-sm">{t('notifications.push.instant_alerts')}</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">{t('notifications.push.load_updates')}</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">{t('notifications.push.driver_check_ins')}</span>
                      </label>
                    </div>
                  </div>

                  {/* Próximamente */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">{t('notifications.coming_soon.title')}</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• {t('notifications.coming_soon.sms_notifications')}</li>
                      <li>• {t('notifications.coming_soon.notification_schedule')}</li>
                      <li>• {t('notifications.coming_soon.custom_alerts')}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  );
}