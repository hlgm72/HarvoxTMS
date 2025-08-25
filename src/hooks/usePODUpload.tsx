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
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function PODUploadModal({ loadId, isOpen, onClose, onSuccess }: PODUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { showSuccess, showError } = useFleetNotifications();
  const { mutate: uploadDocument, isPending: isUploading } = useLoadDocumentUploadFlowACID();
  const { t } = useTranslation('loads');
  const queryClient = useQueryClient();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      showError(t('pod_upload.select_file_error'));
      return;
    }

    uploadDocument({
      file: selectedFile,
      documentData: {
        document_type: 'pod',
        load_id: loadId
      }
    }, {
      onSuccess: () => {
        // No mostrar mensaje aquí para POD, ya que se maneja en useLoadCompletion con celebración
        setSelectedFile(null);
        
        // Invalidar queries para refrescar datos
        queryClient.invalidateQueries({ queryKey: ['load-document-validation', loadId] });
        queryClient.invalidateQueries({ queryKey: ['loads'] });
        queryClient.invalidateQueries({ queryKey: ['load-documents'] });
        
        onSuccess();
        onClose();
      },
      onError: (error) => {
        console.error('Error uploading POD:', error);
        showError(t('pod_upload.upload_error'));
      }
    });
  };


  const handleClose = () => {
    setSelectedFile(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-md mx-2 sm:mx-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('pod_upload.title')}
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
              onChange={handleFileChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {selectedFile && (
              <div className="text-xs text-muted-foreground">
                {t('pod_upload.selected_file')}: {selectedFile.name}
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button onClick={handleClose} variant="outline" className="flex-1 text-sm">
              {t('pod_upload.cancel')}
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || isUploading}
              className="flex-1 text-sm"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? t('pod_upload.uploading') : t('pod_upload.upload_button')}
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
  }>({
    isOpen: false,
    loadId: ''
  });

  const openPODUpload = (loadId: string) => {
    setUploadModal({
      isOpen: true,
      loadId
    });
  };

  const closePODUpload = () => {
    setUploadModal({
      isOpen: false,
      loadId: ''
    });
  };

  const PODUploadComponent = ({ onSuccess }: { onSuccess?: () => void }) => (
    <PODUploadModal
      loadId={uploadModal.loadId}
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