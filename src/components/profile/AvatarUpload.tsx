import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Loader2, User, X } from 'lucide-react';
import { useFleetNotifications } from '@/components/notifications/NotificationProvider';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  userName?: string;
  onAvatarUpdate: (avatarUrl: string | null) => void;
}

export function AvatarUpload({ currentAvatarUrl, userName, onAvatarUpdate }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const { showSuccess, showError } = useFleetNotifications();
  const { refreshProfile } = useUserProfile();

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        showError('Error', 'Por favor selecciona un archivo de imagen válido');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        showError('Error', 'El archivo es demasiado grande. Máximo 5MB');
        return;
      }

      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('No authenticated user');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.data.user.id}/avatar.${fileExt}`;

      // Remove old avatar if exists
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${user.data.user.id}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.data.user.id);

      if (updateError) throw updateError;

      // Actualizar el estado local primero
      onAvatarUpdate(publicUrl);
      
      // Refrescar el perfil para actualizar todos los componentes que usan useUserProfile
      await refreshProfile();
      
      showSuccess('Éxito', 'Avatar actualizado correctamente');

    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      showError('Error', 'Error al subir el avatar: ' + error.message);
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const removeAvatar = async () => {
    try {
      setRemoving(true);

      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('No authenticated user');

      // Remove from storage if exists
      if (currentAvatarUrl) {
        const fileName = currentAvatarUrl.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('avatars')
            .remove([`${user.data.user.id}/${fileName}`]);
        }
      }

      // Update profile to remove avatar URL
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', user.data.user.id);

      if (error) throw error;

      // Actualizar el estado local primero
      onAvatarUpdate(null);
      
      // Refrescar el perfil para actualizar todos los componentes que usan useUserProfile
      await refreshProfile();
      
      showSuccess('Éxito', 'Avatar eliminado correctamente');

    } catch (error: any) {
      console.error('Error removing avatar:', error);
      showError('Error', 'Error al eliminar el avatar: ' + error.message);
    } finally {
      setRemoving(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative group">
        <Avatar className="h-24 w-24">
          <AvatarImage src={currentAvatarUrl || undefined} alt="Avatar" />
          <AvatarFallback className="text-lg">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
        
        {/* Loading overlay when processing */}
        {(uploading || removing) && (
          <div className="absolute inset-0 bg-black/80 rounded-full flex items-center justify-center">
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
              <span className="text-xs text-white font-medium">
                {uploading ? 'Subiendo...' : 'Eliminando...'}
              </span>
            </div>
          </div>
        )}
        
        {/* Upload overlay - only show when not processing */}
        {!uploading && !removing && (
          <Label htmlFor="avatar-upload" className="cursor-pointer">
            <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </Label>
        )}
      </div>

      <div className="flex flex-col space-y-2">
        <div className="relative">
          <Input
            type="file"
            accept="image/*"
            onChange={uploadAvatar}
            disabled={uploading || removing}
            className="hidden"
            id="avatar-upload"
          />
          <Button 
            variant="outline" 
            disabled={uploading || removing}
            className="w-full"
            onClick={() => document.getElementById('avatar-upload')?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                Cambiar foto
              </>
            )}
          </Button>
        </div>

        {currentAvatarUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={removeAvatar}
            disabled={uploading || removing}
            className="text-muted-foreground hover:text-destructive"
          >
            {removing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <X className="h-4 w-4 mr-2" />
                Eliminar foto
              </>
            )}
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center max-w-sm">
        Formatos soportados: JPG, PNG, GIF. Tamaño máximo: 5MB
      </p>
    </div>
  );
}