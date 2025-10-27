import { useState, useRef } from "react";
import { Upload, X, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useFleetNotifications } from "@/components/notifications";
import { SmartLogoSearch } from "@/components/ui/SmartLogoSearch";
import { useTranslation } from "react-i18next";

interface ClientLogoUploadProps {
  logoUrl?: string;
  clientName?: string;
  emailDomain?: string;
  clientId?: string;
  onLogoChange: (url: string | null) => void;
  disabled?: boolean;
}

export function ClientLogoUpload({ logoUrl, clientName, emailDomain, clientId, onLogoChange, disabled }: ClientLogoUploadProps) {
  const { t } = useTranslation('clients');
  const [uploading, setUploading] = useState(false);
  const { showSuccess, showError } = useFleetNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadLogo = async (file: File) => {
    try {
      setUploading(true);

      // Get file extension from MIME type to ensure correct format
      let fileExt = 'png';
      if (file.type.includes('jpeg') || file.type.includes('jpg')) {
        fileExt = 'jpg';
      } else if (file.type.includes('png')) {
        fileExt = 'png';
      } else if (file.type.includes('svg')) {
        fileExt = 'svg';
      } else if (file.type.includes('webp')) {
        fileExt = 'webp';
      }
      
      // Generate clean company name for consistent file naming
      const cleanCompanyName = clientName
        ? clientName.toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
        : 'client-logo';
      
      const fileName = `${cleanCompanyName}.${fileExt}`;
      // Use clientId for organized storage, or temp folder if no clientId yet
      const filePath = clientId 
        ? `${clientId}/${fileName}`
        : `temp/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('client-logos')
        .upload(filePath, file, {
          contentType: file.type, // Preserve original content type
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('client-logos')
        .getPublicUrl(filePath);

      onLogoChange(data.publicUrl);
      showSuccess(t('logoUpload.success'));
    } catch (error) {
      console.error('Error uploading logo:', error);
      showError(t('logoUpload.errorUpload'));
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError(t('logoUpload.errorFileType'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError(t('logoUpload.errorFileSize'));
      return;
    }

    uploadLogo(file);
  };

  const removeLogo = async () => {
    if (logoUrl) {
      try {
        // Extract file path from URL (everything after the bucket name)
        const urlParts = logoUrl.split('/storage/v1/object/public/client-logos/');
        const filePath = urlParts[1] || logoUrl.split('/').slice(-2).join('/');

        await supabase.storage
          .from('client-logos')
          .remove([filePath]);

        onLogoChange(null);
        showSuccess(t('logoUpload.removed'));
      } catch (error) {
        console.error('Error removing logo:', error);
        showError(t('logoUpload.errorRemove'));
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
        <Avatar key={logoUrl || 'no-logo'} className="h-20 w-20 flex-shrink-0 bg-white border border-border">
          <AvatarImage 
            src={logoUrl ? `${logoUrl}${logoUrl.includes('?') ? '&' : '?'}t=${Date.now()}` : undefined}
            alt={clientName}
            className="object-contain p-2"
            loading="eager"
          />
          <AvatarFallback className="bg-muted">
            {clientName ? getInitials(clientName) : <Building2 className="h-8 w-8" />}
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
              {uploading ? t('logoUpload.uploading') : logoUrl ? t('logoUpload.changeButton') : t('logoUpload.uploadButton')}
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
                {t('logoUpload.removeButton')}
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {t('logoUpload.fileTypes')}
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
            clientId={clientId}
            onLogoSelect={onLogoChange}
          />
        </div>
      )}
    </div>
  );
}