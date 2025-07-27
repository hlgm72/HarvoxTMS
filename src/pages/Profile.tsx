import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

import { useFleetNotifications } from '@/components/notifications';
import { useUserProfile } from '@/hooks/useUserProfile';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { PageToolbar } from '@/components/layout/PageToolbar';
import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function Profile() {
  const { t } = useTranslation(['common']);
  const navigate = useNavigate();
  const { isSuperAdmin, isCompanyOwner, isOperationsManager, isDispatcher, isDriver } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const { profile, loading, user, refreshProfile } = useUserProfile();

  // Función para obtener la ruta del dashboard según el rol del usuario
  const getDashboardRoute = () => {
    if (isSuperAdmin) return '/superadmin';
    if (isCompanyOwner) return '/dashboard/owner';
    if (isOperationsManager) return '/dashboard/operations';
    if (isDispatcher) return '/dashboard/dispatch';
    if (isDriver) return '/dashboard/driver';
    return '/'; // Fallback
  };

  const onCancelProfile = () => {
    navigate(getDashboardRoute());
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Cargando perfil...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageToolbar 
        icon={User}
        title="Mi Perfil"
        subtitle="Gestiona tu información personal y configuración de cuenta"
      />
      <div className="container mx-auto p-3 md:p-6 max-w-6xl">
        <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
          {/* Profile Summary Card */}
          <Card className="lg:col-span-1 order-2 lg:order-1">
            <CardHeader className="text-center p-4 md:p-6">
              <AvatarUpload 
                currentAvatarUrl={profile?.avatar_url}
                userName={`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()}
                onAvatarUpdate={async (avatarUrl) => {
                  // Refresh profile to get updated data
                  await refreshProfile();
                }}
              />
              <CardTitle className="text-lg md:text-xl mt-4">{profile?.first_name} {profile?.last_name}</CardTitle>
              <CardDescription className="text-sm">{user?.email}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-3 text-sm">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-muted-foreground font-medium">Teléfono:</span>
                  <span className="text-foreground">{profile?.phone || 'No especificado'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-muted-foreground font-medium">Idioma:</span>
                  <span className="text-foreground">{profile?.preferred_language === 'es' ? 'Español' : 'English'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-muted-foreground font-medium">Zona horaria:</span>
                  <span className="text-foreground">{profile?.timezone || 'America/New_York'}</span>
                </div>
                {(profile?.street_address || profile?.zip_code) && (
                  <div className="pt-2 border-t">
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground font-medium">Dirección:</span>
                      <div className="text-foreground text-xs leading-relaxed">
                        {profile?.street_address && (
                          <div>{profile.street_address}</div>
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

          {/* Profile Form */}
          <Card className="lg:col-span-2 order-1 lg:order-2">
            <CardContent className="p-4 md:p-6">
              <ProfileForm onCancel={onCancelProfile} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}