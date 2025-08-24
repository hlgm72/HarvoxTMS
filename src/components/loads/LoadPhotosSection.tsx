import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Upload, Eye, Trash2, ImageIcon, Loader2 } from 'lucide-react';
import { useFleetNotifications } from "@/components/notifications";
import { supabase } from '@/integrations/supabase/client';
import { useLoadDocumentManagementACID } from '@/hooks/useLoadDocumentManagementACID';
import { useTranslation } from 'react-i18next';

interface LoadPhotoDocument {
  id: string;
  type: 'load_photos';
  name: string;
  fileName: string;
  fileSize?: number;
  uploadedAt: Date | string;
  url: string;
  category?: 'pickup' | 'delivery';
}

interface LoadPhotosSectionProps {
  loadId?: string;
  loadData?: any;
  loadPhotos: any[];
  onPhotosChange?: (photos: any[]) => void;
  user?: any;
  onReloadDocuments?: () => Promise<void>;
}

export function LoadPhotosSection({
  loadId,
  loadData,
  loadPhotos,
  onPhotosChange,
  user,
  onReloadDocuments
}: LoadPhotosSectionProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<'pickup' | 'delivery'>('pickup');
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map());
  const { showSuccess, showError } = useFleetNotifications();
  const { mutate: createLoadDocument } = useLoadDocumentManagementACID();

  // Count photos by category
  const pickupPhotos = loadPhotos.filter(photo => photo.category === 'pickup');
  const deliveryPhotos = loadPhotos.filter(photo => photo.category === 'delivery');

  // Generate signed URLs for photo previews
  useEffect(() => {
    const generateSignedUrls = async () => {
      const newPhotoUrls = new Map();
      
      for (const photo of loadPhotos) {
        if (photo.url && !photo.url.startsWith('blob:')) {
          try {
            let storageFilePath = photo.url;
            if (photo.url.includes('/load-documents/')) {
              storageFilePath = photo.url.split('/load-documents/')[1];
            }
            
            const { data: signedUrlData, error } = await supabase.storage
              .from('load-documents')
              .createSignedUrl(storageFilePath, 3600);
            
            if (!error && signedUrlData?.signedUrl) {
              newPhotoUrls.set(photo.id, signedUrlData.signedUrl);
            }
          } catch (error) {
            console.error('Error generating signed URL for photo:', photo.id, error);
          }
        } else if (photo.url?.startsWith('blob:')) {
          newPhotoUrls.set(photo.id, photo.url);
        }
      }
      
      setPhotoUrls(newPhotoUrls);
    };
    
    if (loadPhotos.length > 0) {
      generateSignedUrls();
    }
  }, [loadPhotos]);

  const canUploadMorePhotos = (category: 'pickup' | 'delivery') => {
    const currentCount = category === 'pickup' ? pickupPhotos.length : deliveryPhotos.length;
    return currentCount < 4;
  };

  const handleFileUpload = async (file: File, category: 'pickup' | 'delivery') => {
    if (!canUploadMorePhotos(category)) {
      const categoryLabel = category === 'pickup' 
        ? t("loads:create_wizard.phases.documents.photos.categories.pickup_label")
        : t("loads:create_wizard.phases.documents.photos.categories.delivery_label");
      showError(
        t("loads:create_wizard.phases.documents.photos.error_messages.limit_reached"), 
        t("loads:create_wizard.phases.documents.photos.error_messages.limit_category", { category: categoryLabel })
      );
      return;
    }

    // Validate file type
    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!acceptedTypes.includes(file.type)) {
      showError(
        t("loads:create_wizard.phases.documents.photos.error_messages.invalid_file_type"), 
        t("loads:create_wizard.phases.documents.photos.error_messages.accepted_formats")
      );
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showError(
        t("loads:create_wizard.phases.documents.photos.error_messages.file_too_large"), 
        t("loads:create_wizard.phases.documents.photos.error_messages.max_size")
      );
      return;
    }

    const uploadKey = `${category}-${Date.now()}`;
    setUploading(uploadKey);

    try {
      const fileExt = file.name.split('.').pop();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${loadData.load_number}_Photo_${category}_${timestamp}.${fileExt}`;
      const filePath = `${user?.id}/${loadData.id}/photos/${fileName}`;

      const { data, error } = await supabase.storage
        .from('load-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading photo:', error);
        showError("Error", t("loads:create_wizard.phases.documents.photos.error_messages.upload_failed"));
        return;
      }

      const documentData = {
        load_id: loadData.id,
        document_type: 'load_photos',
        file_name: fileName,
        file_url: filePath,
        file_size: file.size,
        content_type: file.type,
        uploaded_by: user?.id || '',
        metadata: JSON.stringify({ category })
      };

      try {
        createLoadDocument({
          documentData
        });
      } catch (error) {
        console.error('Error saving photo to database:', error);
        await supabase.storage.from('load-documents').remove([filePath]);
        showError("Error", t("loads:create_wizard.phases.documents.photos.error_messages.save_failed"));
        return;
      }

      await onReloadDocuments?.();
      const categoryLabel = category === 'pickup' 
        ? t("loads:create_wizard.phases.documents.photos.categories.pickup_spanish")
        : t("loads:create_wizard.phases.documents.photos.categories.delivery_spanish");
      showSuccess(
        t("loads:create_wizard.phases.documents.photos.success_messages.uploaded"), 
        t("loads:create_wizard.phases.documents.photos.success_messages.uploaded_category", { category: categoryLabel })
      );
    } catch (error) {
      console.error('Error uploading photo:', error);
      showError("Error", t("loads:create_wizard.phases.documents.photos.error_messages.unexpected_upload"));
    } finally {
      setUploading(null);
    }
  };

  const handleRemovePhoto = async (photoId: string) => {
    setRemoving(prev => new Set([...prev, photoId]));

    try {
      const photo = loadPhotos.find(p => p.id === photoId);
      if (!photo) return;

      // Delete from database
      const { error: dbError } = await supabase
        .from('load_documents')
        .delete()
        .eq('id', photoId);

      if (dbError) {
        console.error('Error removing photo from database:', dbError);
        showError("Error", t("loads:create_wizard.phases.documents.photos.error_messages.delete_failed"));
        return;
      }

      // Remove from storage
      if (photo.url && !photo.url.startsWith('blob:')) {
        let storageFilePath = photo.url;
        if (photo.url.includes('/load-documents/')) {
          storageFilePath = photo.url.split('/load-documents/')[1];
        }
        
        const { error: storageError } = await supabase.storage
          .from('load-documents')
          .remove([storageFilePath]);

        if (storageError) {
          console.error('Storage error:', storageError);
        }
      }

      await onReloadDocuments?.();
      showSuccess(
        t("loads:create_wizard.phases.documents.photos.success_messages.deleted"), 
        t("loads:create_wizard.phases.documents.photos.success_messages.deleted_success")
      );
    } catch (error) {
      console.error('Error removing photo:', error);
      showError("Error", t("loads:create_wizard.phases.documents.photos.error_messages.unexpected_delete"));
    } finally {
      setRemoving(prev => {
        const newSet = new Set(prev);
        newSet.delete(photoId);
        return newSet;
      });
    }
  };

  const handleViewPhoto = async (photo: LoadPhotoDocument) => {
    try {
      if (photo.url.startsWith('blob:')) {
        window.open(photo.url, '_blank');
        return;
      }

      let storageFilePath = photo.url;
      if (photo.url.includes('/load-documents/')) {
        storageFilePath = photo.url.split('/load-documents/')[1];
      }

      const { data: signedUrlData, error } = await supabase.storage
        .from('load-documents')
        .createSignedUrl(storageFilePath, 3600);

      if (error) {
        showError("Error", t("loads:create_wizard.phases.documents.photos.error_messages.view_failed"));
        return;
      }

      if (signedUrlData?.signedUrl) {
        window.open(signedUrlData.signedUrl, '_blank');
      }
    } catch (error) {
      showError("Error", t("loads:create_wizard.phases.documents.photos.error_messages.open_failed"));
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>, category: 'pickup' | 'delivery') => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file, category);
    }
    // Reset the input value so the same file can be selected again
    event.target.value = '';
  };

  const triggerFileUpload = (category: 'pickup' | 'delivery') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = (e) => handleFileInputChange(e as any, category);
    input.click();
  };

  const renderPhotoGrid = (photos: LoadPhotoDocument[], category: 'pickup' | 'delivery') => {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {photos.map((photo) => {
          const photoUrl = photoUrls.get(photo.id);
          
          return (
            <div key={photo.id} className="relative group">
              <div className="aspect-square border rounded-lg overflow-hidden bg-muted/20">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={photo.fileName}
                    className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleViewPhoto(photo)}
                    onError={(e) => {
                      console.error('Error loading image:', photo.fileName);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                 )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 w-7 p-0"
                        onClick={() => handleViewPhoto(photo)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                     <TooltipContent>
                       <p>{t('common:common.view')}</p>
                     </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <AlertDialog>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 w-7 p-0"
                            disabled={removing.has(photo.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                      </TooltipTrigger>
                       <TooltipContent>
                         <p>{t('common:common.delete')}</p>
                       </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                   <AlertDialogContent>
                     <AlertDialogHeader>
                       <AlertDialogTitle>{t("loads:create_wizard.phases.documents.photos.delete_photo_title")}</AlertDialogTitle>
                       <AlertDialogDescription>
                         {t("loads:create_wizard.phases.documents.photos.delete_photo_description")}
                       </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter>
                       <AlertDialogCancel>{t("loads:create_wizard.phases.documents.photos.cancel")}</AlertDialogCancel>
                       <AlertDialogAction
                         onClick={() => handleRemovePhoto(photo.id)}
                         className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                       >
                         {t("loads:create_wizard.phases.documents.photos.delete_confirm")}
                       </AlertDialogAction>
                     </AlertDialogFooter>
                   </AlertDialogContent>
                </AlertDialog>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {photo.fileName}
              </p>
            </div>
          );
        })}
        
        {/* Empty slots with upload on hover */}
        {Array.from({ length: 4 - photos.length }).map((_, index) => (
          <div 
            key={`empty-${index}`} 
            className="aspect-square border border-dashed border-border/40 rounded-lg flex items-center justify-center bg-muted/10 group cursor-pointer hover:bg-muted/20 transition-colors"
            onClick={() => triggerFileUpload(category)}
            title={t('loads:create_wizard.phases.documents.photos.upload_photo')}
          >
            <div className="flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-muted-foreground group-hover:hidden" />
              <Upload className="h-6 w-6 text-muted-foreground hidden group-hover:block" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Check if there are any photos
  const hasPhotos = loadPhotos.length > 0;
  const hasPickupPhotos = pickupPhotos.length > 0;
  const hasDeliveryPhotos = deliveryPhotos.length > 0;

  if (!hasPhotos) {
    // Empty state similar to documents
    return (
      <div className="p-6 border rounded-lg bg-white">
        <div className="flex items-center gap-2 mb-2">
          <Camera className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{t("loads:create_wizard.phases.documents.photos.title")}</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          {t("loads:create_wizard.phases.documents.photos.description")}
        </p>
        <div className="text-center py-8">
          <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-2">
            {t("loads:create_wizard.phases.documents.photos.empty_state.title")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("loads:create_wizard.phases.documents.photos.empty_state.description")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-3 border rounded-lg bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{t("loads:create_wizard.phases.documents.photos.title")}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {t("loads:create_wizard.phases.documents.photos.photo_count", { count: loadPhotos.length })}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("loads:create_wizard.phases.documents.photos.description")}
        </p>
      </div>

      {/* Pickup Photos Section */}
      {hasPickupPhotos && (
        <div className="p-3 border rounded-lg bg-white">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{t("loads:create_wizard.phases.documents.photos.pickup_photos")}</span>
            <Badge variant="outline" className="text-xs">
              {t("loads:create_wizard.phases.documents.photos.category_count", { count: pickupPhotos.length })}
            </Badge>
          </div>
          {renderPhotoGrid(pickupPhotos, 'pickup')}
        </div>
      )}

      {/* Delivery Photos Section */}
      {hasDeliveryPhotos && (
        <div className="p-3 border rounded-lg bg-white">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{t("loads:create_wizard.phases.documents.photos.delivery_photos")}</span>
            <Badge variant="outline" className="text-xs">
              {t("loads:create_wizard.phases.documents.photos.category_count", { count: deliveryPhotos.length })}
            </Badge>
          </div>
          {renderPhotoGrid(deliveryPhotos, 'delivery')}
        </div>
      )}
    </div>
  );
}