import { useState, useRef } from "react";
import { Upload, X, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SmartLogoSearch } from "@/components/ui/SmartLogoSearch";

interface ClientLogoUploadProps {
  logoUrl?: string;
  clientName?: string;
  emailDomain?: string;
  onLogoChange: (url: string | null) => void;
  disabled?: boolean;
}

export function ClientLogoUpload({ logoUrl, clientName, emailDomain, onLogoChange, disabled }: ClientLogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadLogo = async (file: File) => {
    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `client-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('client-logos')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('client-logos')
        .getPublicUrl(filePath);

      onLogoChange(data.publicUrl);
      toast.success('Logo cargado exitosamente');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Error al cargar el logo');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande. Máximo 5MB');
      return;
    }

    uploadLogo(file);
  };

  const removeLogo = async () => {
    if (logoUrl) {
      try {
        // Extract file path from URL
        const urlParts = logoUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `client-logos/${fileName}`;

        await supabase.storage
          .from('client-logos')
          .remove([filePath]);

        onLogoChange(null);
        toast.success('Logo eliminado');
      } catch (error) {
        console.error('Error removing logo:', error);
        toast.error('Error al eliminar el logo');
      }
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 flex-shrink-0">
          <AvatarImage src={logoUrl} alt={clientName} />
          <AvatarFallback>
            {clientName ? getInitials(clientName) : <Building2 className="h-6 w-6" />}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Cargando...' : logoUrl ? 'Cambiar Logo' : 'Cargar Logo'}
            </Button>

            {logoUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={removeLogo}
                disabled={disabled || uploading}
              >
                <X className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            PNG, JPG hasta 5MB
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Smart Logo Search Section - Debajo del logo */}
      {clientName && (
        <div className="border-t pt-4">
          <SmartLogoSearch
            companyName={clientName}
            emailDomain={emailDomain}
            currentLogoUrl={logoUrl}
            onLogoSelect={onLogoChange}
          />
        </div>
      )}
    </div>
  );
}