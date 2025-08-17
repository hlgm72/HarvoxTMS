import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Upload, Eye, Trash2, ImageIcon, Loader2 } from 'lucide-react';
import { useFleetNotifications } from "@/components/notifications";
import { supabase } from '@/integrations/supabase/client';

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
  const [uploading, setUploading] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<'pickup' | 'delivery'>('pickup');
  const { showSuccess, showError } = useFleetNotifications();

  // Count photos by category
  const pickupPhotos = loadPhotos.filter(photo => photo.category === 'pickup');
  const deliveryPhotos = loadPhotos.filter(photo => photo.category === 'delivery');

  const canUploadMorePhotos = (category: 'pickup' | 'delivery') => {
    const currentCount = category === 'pickup' ? pickupPhotos.length : deliveryPhotos.length;
    return currentCount < 4;
  };

  const handleFileUpload = async (file: File, category: 'pickup' | 'delivery') => {
    if (!canUploadMorePhotos(category)) {
      showError("Límite alcanzado", `Ya tienes 4 fotos en la categoría ${category === 'pickup' ? 'Pickup' : 'Delivery'}`);
      return;
    }

    // Validate file type
    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!acceptedTypes.includes(file.type)) {
      showError("Tipo de archivo no válido", "Solo se permiten archivos JPG, PNG y WEBP");
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showError("Archivo muy grande", "El archivo no puede ser mayor a 10MB");
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
        showError("Error", "No se pudo subir la foto");
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

      const { error: dbError } = await supabase
        .from('load_documents')
        .insert(documentData);

      if (dbError) {
        console.error('Error saving photo to database:', dbError);
        await supabase.storage.from('load-documents').remove([filePath]);
        showError("Error", "No se pudo guardar la información de la foto");
        return;
      }

      await onReloadDocuments?.();
      showSuccess("Foto subida", `Foto de ${category === 'pickup' ? 'pickup' : 'delivery'} subida correctamente`);
    } catch (error) {
      console.error('Error uploading photo:', error);
      showError("Error", "Error inesperado al subir la foto");
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
        showError("Error", "No se pudo eliminar la foto");
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
      showSuccess("Foto eliminada", "La foto se eliminó correctamente");
    } catch (error) {
      console.error('Error removing photo:', error);
      showError("Error", "Error inesperado al eliminar la foto");
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
        showError("Error", "No se pudo generar el enlace para ver la foto");
        return;
      }

      if (signedUrlData?.signedUrl) {
        window.open(signedUrlData.signedUrl, '_blank');
      }
    } catch (error) {
      showError("Error", "No se pudo abrir la foto");
    }
  };

  const renderPhotoGrid = (photos: LoadPhotoDocument[], category: 'pickup' | 'delivery') => {
    const canUpload = canUploadMorePhotos(category);
    
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Camera className="h-4 w-4" />
            {category === 'pickup' ? 'Pickup' : 'Delivery'}
            <Badge variant="outline" className="text-xs">
              {photos.length}/4
            </Badge>
          </h4>
          
          {canUpload && (
            <div className="flex items-center gap-2">
              <input
                type="file"
                id={`upload-${category}`}
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileUpload(e.target.files[0], category);
                  }
                  e.target.value = '';
                }}
                className="hidden"
              />
              <Button
                onClick={() => document.getElementById(`upload-${category}`)?.click()}
                disabled={!!uploading}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
              >
                {uploading?.includes(category) ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-3 w-3 mr-1" />
                )}
                {uploading?.includes(category) ? 'Subiendo...' : 'Subir Foto'}
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group">
              <div className="aspect-square border rounded-lg overflow-hidden bg-muted/20">
                <img
                  src={photo.url.startsWith('blob:') ? photo.url : `${supabase.storage.from('load-documents').getPublicUrl(photo.url.includes('/load-documents/') ? photo.url.split('/load-documents/')[1] : photo.url).data.publicUrl}`}
                  alt={photo.fileName}
                  className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleViewPhoto(photo)}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 w-7 p-0"
                    onClick={() => handleViewPhoto(photo)}
                    title="Ver foto"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 w-7 p-0"
                        disabled={removing.has(photo.id)}
                        title="Eliminar foto"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar foto?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción eliminará permanentemente esta foto. No se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemovePhoto(photo.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar
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
          ))}
          
          {/* Empty slots */}
          {Array.from({ length: 4 - photos.length }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square border border-dashed border-border/40 rounded-lg flex items-center justify-center bg-muted/10">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-3 border rounded-lg bg-white space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Fotos de la Carga</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {loadPhotos.length}/8 fotos
        </Badge>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Fotografías del pickup y delivery (máx. 4 por categoría)
      </p>

      <div className="space-y-6">
        {renderPhotoGrid(pickupPhotos, 'pickup')}
        {renderPhotoGrid(deliveryPhotos, 'delivery')}
      </div>
    </div>
  );
}