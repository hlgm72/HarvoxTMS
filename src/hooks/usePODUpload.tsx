import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText } from "lucide-react";
import { useDocumentUploadFlowACID } from '@/hooks/useDocumentManagementACID';
import { useFleetNotifications } from '@/components/notifications';
import { supabase } from '@/integrations/supabase/client';

interface PODUploadModalProps {
  loadId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function PODUploadModal({ loadId, isOpen, onClose, onSuccess }: PODUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [companyId, setCompanyId] = useState<string>('');
  const { showSuccess, showError } = useFleetNotifications();
  const { mutate: uploadDocument, isPending: isUploading } = useDocumentUploadFlowACID();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !companyId) {
      showError('Por favor selecciona un archivo PDF');
      return;
    }

    uploadDocument({
      file: selectedFile,
      documentData: {
        document_type: 'pod',
        company_id: companyId,
        load_id: loadId
      }
    }, {
      onSuccess: () => {
        showSuccess('POD subido exitosamente');
        setSelectedFile(null);
        onSuccess();
        onClose();
      },
      onError: (error) => {
        console.error('Error uploading POD:', error);
        showError('Error al subir el POD');
      }
    });
  };

  // Obtener company_id del usuario actual
  useEffect(() => {
    const fetchCompanyId = async () => {
      if (isOpen) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data } = await supabase
              .from('user_company_roles')
              .select('company_id')
              .eq('user_id', user.id)
              .eq('is_active', true)
              .single();
            
            if (data) {
              setCompanyId(data.company_id);
            }
          }
        } catch (error) {
          console.error('Error fetching company ID:', error);
        }
      }
    };
    
    fetchCompanyId();
  }, [isOpen]);

  const handleClose = () => {
    setSelectedFile(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Subir Proof of Delivery (POD)
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Selecciona el archivo PDF del Proof of Delivery para completar la entrega.
          </div>
          
          <div className="space-y-2">
            <label htmlFor="pod-file" className="text-sm font-medium">
              Archivo PDF
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
                Archivo seleccionado: {selectedFile.name}
              </div>
            )}
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button onClick={handleClose} variant="outline" className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || isUploading}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Subiendo...' : 'Subir POD'}
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