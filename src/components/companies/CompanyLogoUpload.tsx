import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Loader2, Building, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CompanyLogoUploadProps {
  companyId: string;
  currentLogoUrl?: string | null;
  companyName?: string;
  onLogoUpdate: (logoUrl: string | null) => void;
}

export function CompanyLogoUpload({ 
  companyId, 
  currentLogoUrl, 
  companyName, 
  onLogoUpdate 
}: CompanyLogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const { toast } = useToast();

  const uploadLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Por favor selecciona un archivo de imagen válido",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "El archivo es demasiado grande. Máximo 5MB",
          variant: "destructive",
        });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${companyId}/logo.${fileExt}`;

      // Remove old logo if exists
      if (currentLogoUrl) {
        const oldPath = currentLogoUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('company-logos')
            .remove([`${companyId}/${oldPath}`]);
        }
      }

      // Upload new logo to public bucket
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      // Update company with new logo URL
      const { error: updateError } = await supabase
        .from('companies')
        .update({ logo_url: publicUrl })
        .eq('id', companyId);

      if (updateError) throw updateError;

      onLogoUpdate(publicUrl);
      
      toast({
        title: "Éxito",
        description: "Logo de la empresa actualizado correctamente",
      });

    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Error",
        description: "Error al subir el logo: " + error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const removeLogo = async () => {
    try {
      setRemoving(true);

      // Remove from storage if exists
      if (currentLogoUrl) {
        const fileName = currentLogoUrl.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('company-logos')
            .remove([`${companyId}/${fileName}`]);
        }
      }

      // Update company to remove logo URL
      const { error } = await supabase
        .from('companies')
        .update({ logo_url: null })
        .eq('id', companyId);

      if (error) throw error;

      onLogoUpdate(null);
      
      toast({
        title: "Éxito",
        description: "Logo de la empresa eliminado correctamente",
      });

    } catch (error: any) {
      console.error('Error removing logo:', error);
      toast({
        title: "Error",
        description: "Error al eliminar el logo: " + error.message,
        variant: "destructive",
      });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Label>Logo de la Empresa</Label>
      
      <div className="flex items-start space-x-4">
        {/* Logo preview */}
        <div className="relative group">
          <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
            {currentLogoUrl ? (
              <img 
                src={currentLogoUrl} 
                alt={`Logo de ${companyName}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <Building className="h-8 w-8 text-gray-400" />
            )}
            
            {/* Loading overlay when processing */}
            {(uploading || removing) && (
              <div className="absolute inset-0 bg-black/80 rounded-lg flex items-center justify-center">
                <div className="flex flex-col items-center space-y-1">
                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                  <span className="text-xs text-white font-medium">
                    {uploading ? 'Subiendo...' : 'Eliminando...'}
                  </span>
                </div>
              </div>
            )}
            
            {/* Upload overlay - only show when not processing */}
            {!uploading && !removing && (
              <Label htmlFor="logo-upload" className="cursor-pointer">
                <div className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-4 w-4 text-white" />
                </div>
              </Label>
            )}
          </div>
        </div>

        {/* Upload controls */}
        <div className="flex-1 space-y-3">
          <div className="relative">
            <Input
              type="file"
              accept="image/*"
              onChange={uploadLogo}
              disabled={uploading || removing}
              className="hidden"
              id="logo-upload"
            />
            <Button 
              variant="outline" 
              disabled={uploading || removing}
              className="w-full"
              onClick={() => document.getElementById('logo-upload')?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  {currentLogoUrl ? 'Cambiar logo' : 'Subir logo'}
                </>
              )}
            </Button>
          </div>

          {currentLogoUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={removeLogo}
              disabled={uploading || removing}
              className="w-full text-muted-foreground hover:text-destructive"
            >
              {removing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Eliminar logo
                </>
              )}
            </Button>
          )}

          <p className="text-xs text-muted-foreground">
            Formatos soportados: JPG, PNG, GIF. Tamaño máximo: 5MB
          </p>
        </div>
      </div>
    </div>
  );
}