import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, Download, Eye, Loader2, Trash2 } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useFleetNotifications } from '@/components/notifications';
import { useLoadWorkStatus } from '@/hooks/useLoadWorkStatus';
import { validateDocumentAction } from '@/utils/loadDocumentValidation';

interface LoadDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size: number;
  content_type: string;
  created_at: string;
}

interface LoadDocumentsListProps {
  loadId: string;
  maxItems?: number;
  showActions?: boolean;
  refreshTrigger?: number;
  showDeleteButton?: boolean;
}

const documentTypeLabels: Record<string, string> = {
  'rate_confirmation': 'RC',
  'driver_instructions': 'DI', 
  'bol': 'BOL',
  'load_order': 'LO',
  'pod': 'POD',
  'receipt': 'RCPT',
  'other': 'OD'
};

const documentTypeColors: Record<string, string> = {
  'rate_confirmation': 'bg-blue-100 text-blue-800 border-blue-200',
  'driver_instructions': 'bg-green-100 text-green-800 border-green-200',
  'bol': 'bg-purple-100 text-purple-800 border-purple-200',
  'load_order': 'bg-orange-100 text-orange-800 border-orange-200',
  'pod': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'receipt': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'other': 'bg-gray-100 text-gray-800 border-gray-200'
};

// Orden de prioridad para mostrar documentos
const documentTypeOrder = [
  'rate_confirmation',
  'driver_instructions', 
  'bol',
  'load_order',
  'pod',
  'receipt',
  'other'
];

export function LoadDocumentsList({ 
  loadId, 
  maxItems = 3, 
  showActions = false,
  refreshTrigger = 0,
  showDeleteButton = false
}: LoadDocumentsListProps) {
  const [documents, setDocuments] = useState<LoadDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [forceRefresh, setForceRefresh] = useState(0);
  const { showError, showSuccess } = useFleetNotifications();
  const { data: workStatus } = useLoadWorkStatus(loadId);

  useEffect(() => {
    let mounted = true;
    
    const fetchDocuments = async () => {
      if (!loadId) {
        if (mounted) {
          setIsLoading(false);
        }
        return;
      }
      
      try {
        if (mounted) {
          setIsLoading(true);
        }
        // Use the secure function to load documents (same as other components)
        const { data, error } = await supabase.rpc('get_load_documents_with_validation', {
          target_load_id: loadId
        });

        if (error) throw error;
        
        if (mounted) {
          setDocuments(data || []);
          setIsLoading(false);
        }
      } catch (error) {
        if (mounted) {
          console.error('Error fetching load documents:', error);
          setIsLoading(false);
          showError(
            "Error",
            "No se pudieron cargar los documentos"
          );
        }
      }
    };

    fetchDocuments();

    // Configurar listener de tiempo real para actualizaciones de documentos
    const channel = supabase
      .channel(`load_documents_${loadId}_${refreshTrigger}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'load_documents',
          filter: `load_id=eq.${loadId}`
        },
        (payload) => {
          console.log('Document change detected:', payload);
          // Refrescar documentos cuando haya cambios, pero solo si no estamos cargando
          if (mounted) {
            fetchDocuments();
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [loadId, refreshTrigger]); // Agregué refreshTrigger como dependencia

  const handleDownload = async (doc: LoadDocument) => {
    try {
      // The file_url is stored as a storage path, not a full URL
      let filePath = doc.file_url;
      console.log('🔍 LoadDocumentsList - Original file_url:', doc.file_url);
      
      // Generate signed URL for private bucket
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('load-documents')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (urlError) {
        console.error('Error generating signed URL for download:', urlError);
        showError("Error", "No se pudo generar el enlace de descarga");
        return;
      }

      if (signedUrlData?.signedUrl) {
        const link = window.document.createElement('a');
        link.href = signedUrlData.signedUrl;
        link.download = doc.file_name;
        link.target = '_blank';
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      showError(
        "Error",
        "No se pudo descargar el documento"
      );
    }
  };

  const handleDelete = async (document: LoadDocument) => {
    if (!workStatus) return;
    
    const validation = validateDocumentAction(
      document.document_type,
      workStatus.currentStatus,
      'delete'
    );
    
    if (!validation.canDelete) {
      showError("Acción no permitida", validation.reason || "No se puede eliminar este documento");
      return;
    }
    
    try {
      const { error } = await supabase.rpc('delete_load_document_with_validation', {
        document_id_param: document.id
      });
      
      if (error) throw error;
      
      showSuccess("Documento eliminado exitosamente");
      setForceRefresh(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting document:', error);
      showError("Error", "No se pudo eliminar el documento");
    }
  };

  const handleView = async (document: LoadDocument) => {
    console.log('🎯 LoadDocumentsList - handleView called with document:', document);
    try {
      console.log('🔍 LoadDocumentsList - Processing URL:', document.file_url);

      // Check if it's already a public URL that we can open directly
      if (document.file_url.includes('supabase.co/storage/v1/object/public/')) {
        console.log('✅ LoadDocumentsList - Opening public URL directly:', document.file_url);
        window.open(document.file_url, '_blank');
        return;
      }

      // Extract storage path from URL if it's a full Supabase URL
      let filePath = document.file_url;
      if (document.file_url.includes('supabase.co/storage/v1/object/')) {
        const parts = document.file_url.split('/load-documents/');
        if (parts.length > 1) {
          filePath = parts[1];
        }
      }
      
      console.log('🔍 LoadDocumentsList - Storage path for signing:', filePath);

      // Generate signed URL for private bucket
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('load-documents')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      console.log('🔗 LoadDocumentsList - Generated signed URL:', signedUrlData?.signedUrl);

      if (urlError) {
        console.error('❌ LoadDocumentsList - Error generating signed URL:', urlError);
        showError("Error", "No se pudo generar el enlace para ver el documento");
        return;
      }

      if (signedUrlData?.signedUrl) {
        console.log('✅ LoadDocumentsList - Opening URL in new tab:', signedUrlData.signedUrl);
        window.open(signedUrlData.signedUrl, '_blank');
      } else {
        console.error('❌ LoadDocumentsList - No signed URL returned');
        showError("Error", "No se pudo generar el enlace para ver el documento");
      }
    } catch (error) {
      console.error('❌ LoadDocumentsList - Error viewing document:', error);
      showError("Error", "No se pudo abrir el documento");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Cargando documentos...
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic">
        Sin documentos subidos
      </div>
    );
  }

  // Ordenar documentos según el tipo especificado
  const sortedDocuments = documents.sort((a, b) => {
    const indexA = documentTypeOrder.indexOf(a.document_type);
    const indexB = documentTypeOrder.indexOf(b.document_type);
    
    // Si no se encuentra el tipo, ponerlo al final
    const priorityA = indexA === -1 ? documentTypeOrder.length : indexA;
    const priorityB = indexB === -1 ? documentTypeOrder.length : indexB;
    
    return priorityA - priorityB;
  });

  const displayDocuments = sortedDocuments.slice(0, maxItems);
  const remainingCount = sortedDocuments.length - maxItems;

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1">
        {displayDocuments.map((document) => (
          <div
            key={document.id}
            className="flex items-center gap-1"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className={`text-xs px-2 py-1 h-5 cursor-help ${documentTypeColors[document.document_type] || documentTypeColors.other}`}
                >
                  {documentTypeLabels[document.document_type] || document.document_type}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{document.file_name}</p>
              </TooltipContent>
            </Tooltip>
           {showActions && (
            <div className="flex gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={() => handleView(document)}
                title="Ver documento"
              >
                <Eye className="h-2.5 w-2.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={() => handleDownload(document)}
                title="Descargar documento"
              >
                <Download className="h-2.5 w-2.5" />
              </Button>
              {showDeleteButton && workStatus && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(document)}
                  title={
                    validateDocumentAction(document.document_type, workStatus.currentStatus, 'delete').canDelete
                      ? "Eliminar documento"
                      : validateDocumentAction(document.document_type, workStatus.currentStatus, 'delete').reason
                  }
                  disabled={!validateDocumentAction(document.document_type, workStatus.currentStatus, 'delete').canDelete}
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </Button>
              )}
            </div>
          )}
          </div>
        ))}
        
        {remainingCount > 0 && (
          <Badge variant="secondary" className="text-xs h-5">
            +{remainingCount}
          </Badge>
        )}
      </div>
    </TooltipProvider>
  );
}