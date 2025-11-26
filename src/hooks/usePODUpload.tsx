import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText } from "lucide-react";
import { useLoadDocumentUploadFlowACID } from '@/hooks/useLoadDocumentManagementACID';
import { useFleetNotifications } from '@/components/notifications';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from "@tanstack/react-query";

interface PODUploadModalProps {
  loadId: string;
  loadNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function PODUploadModal({ loadId, loadNumber, isOpen, onClose, onSuccess }: PODUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const { showSuccess, showError } = useFleetNotifications();
  const { mutate: uploadDocument, isPending: isUploading } = useLoadDocumentUploadFlowACID();
  const { t } = useTranslation('loads');
  const queryClient = useQueryClient();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(files);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      showError(t('pod_upload.select_file_error'));
      return;
    }

    setUploadingCount(selectedFiles.length);
    let successCount = 0;
    let errorCount = 0;

    for (const file of selectedFiles) {
      try {
        await new Promise<void>((resolve, reject) => {
          uploadDocument({
            file: file,
            documentData: {
              document_type: 'pod',
              load_id: loadId
            }
          }, {
            onSuccess: () => {
              successCount++;
              resolve();
            },
            onError: (error) => {
              console.error('Error uploading POD:', error);
              errorCount++;
              reject(error);
            }
          });
        });
      } catch (error) {
        // Error already counted
      }
    }

    if (successCount > 0) {
      setSelectedFiles([]);
      
      // Retrasar la invalidación de queries para no interrumpir la celebración
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['load-document-validation', loadId] });
        queryClient.invalidateQueries({ queryKey: ['loads'] });
        queryClient.invalidateQueries({ queryKey: ['load-documents'] });
      }, 6000);
      
      onSuccess();
      onClose();
    }

    if (errorCount > 0) {
      showError(t('pod_upload.upload_error'));
    }

    setUploadingCount(0);
  };


  const handleClose = () => {
    setSelectedFiles([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-md mx-2 sm:mx-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('pod_upload.title_with_number', { loadNumber })}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {t('pod_upload.description')}
          </div>
          
          <div className="space-y-2">
            <label htmlFor="pod-file" className="text-sm font-medium">
              {t('pod_upload.pdf_file_label')}
            </label>
            <input
              id="pod-file"
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {selectedFiles.length > 0 && (
              <div className="space-y-1 mt-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                    <span className="truncate flex-1">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 ml-2"
                      onClick={() => handleRemoveFile(index)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button onClick={handleClose} variant="outline" className="flex-1 text-sm">
              {t('pod_upload.cancel')}
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={selectedFiles.length === 0 || isUploading || uploadingCount > 0}
              className="flex-1 text-sm"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading || uploadingCount > 0 
                ? `${t('pod_upload.uploading')} (${uploadingCount})` 
                : t('pod_upload.upload_button')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function usePODUpload() {
  const [uploadModal, setUploadModal] = useState<{
    isOpen: boolean;
    loadId: string;
    loadNumber: string;
  }>({
    isOpen: false,
    loadId: '',
    loadNumber: ''
  });

  const openPODUpload = (loadId: string, loadNumber: string) => {
    setUploadModal({
      isOpen: true,
      loadId,
      loadNumber
    });
  };

  const closePODUpload = () => {
    setUploadModal({
      isOpen: false,
      loadId: '',
      loadNumber: ''
    });
  };

  const PODUploadComponent = ({ onSuccess }: { onSuccess?: () => void }) => (
    <PODUploadModal
      loadId={uploadModal.loadId}
      loadNumber={uploadModal.loadNumber}
      isOpen={uploadModal.isOpen}
      onClose={closePODUpload}
      onSuccess={onSuccess || (() => {})}
    />
  );

  return {
    openPODUpload,
    closePODUpload,
    PODUploadComponent,
    isUploadModalOpen: uploadModal.isOpen
  };
}