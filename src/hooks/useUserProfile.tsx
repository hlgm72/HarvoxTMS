import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  preferred_language: string | null;
  timezone: string | null;
}

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching profile:', error);
          setProfile(null);
        } else {
          setProfile(data);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // Función para obtener las iniciales del usuario
  const getUserInitials = (): string => {
    // Primero intentamos usar los datos del perfil
    if (profile?.first_name && profile?.last_name) {
      // Validar que last_name no sea un email (error de datos)
      const lastName = profile.last_name.includes('@') ? '' : profile.last_name;
      if (lastName) {
        return `${profile.first_name.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
      } else {
        // Si last_name es un email o está vacío, usar las dos primeras letras del first_name
        return profile.first_name.length >= 2 
          ? `${profile.first_name.charAt(0)}${profile.first_name.charAt(1)}`.toUpperCase()
          : profile.first_name.charAt(0).toUpperCase();
      }
    }
    
    // Si no hay perfil, intentamos usar los metadatos del usuario
    if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name.charAt(0)}${user.user_metadata.last_name.charAt(0)}`.toUpperCase();
    }
    
    // Si solo tenemos first_name (del perfil o metadatos)
    const firstName = profile?.first_name || user?.user_metadata?.first_name;
    if (firstName) {
      return firstName.charAt(0).toUpperCase() + (firstName.charAt(1) || '').toUpperCase();
    }
    
    // Como fallback, usamos el email
    if (user?.email) {
      const emailParts = user.email.split('@')[0];
      if (emailParts.length >= 2) {
        return `${emailParts.charAt(0)}${emailParts.charAt(1)}`.toUpperCase();
      }
      return emailParts.charAt(0).toUpperCase();
    }
    
    return 'U';
  };

  // Función para obtener el nombre completo
  const getFullName = (): string => {
    // Primero intentamos usar los datos del perfil
    if (profile?.first_name || profile?.last_name) {
      // Validar que last_name no sea un email (error de datos)
      const lastName = profile?.last_name?.includes('@') ? '' : profile?.last_name;
      return `${profile?.first_name || ''} ${lastName || ''}`.trim();
    }
    
    // Si no hay perfil, intentamos usar los metadatos del usuario
    if (user?.user_metadata?.first_name || user?.user_metadata?.last_name) {
      return `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim();
    }
    
    // Como fallback, usamos el email
    return user?.email || 'Usuario';
  };

  return {
    profile,
    loading,
    getUserInitials,
    getFullName,
    user
  };
};