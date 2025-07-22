import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye, Loader2 } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
}

const documentTypeLabels: Record<string, string> = {
  'rate_confirmation': 'Rate Confirmation',
  'driver_instructions': 'Instrucciones del Conductor', 
  'bol': 'Bill of Lading',
  'load_order': 'Orden de Carga',
  'pod': 'Proof of Delivery',
  'receipt': 'Recibo',
  'other': 'Otro'
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

export function LoadDocumentsList({ 
  loadId, 
  maxItems = 3, 
  showActions = false 
}: LoadDocumentsListProps) {
  const [documents, setDocuments] = useState<LoadDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    
    const fetchDocuments = async () => {
      if (!loadId) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('load_documents')
          .select('*')
          .eq('load_id', loadId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        if (mounted) {
          setDocuments(data || []);
        }
      } catch (error) {
        if (mounted) {
          console.error('Error fetching load documents:', error);
          toast({
            title: "Error",
            description: "No se pudieron cargar los documentos",
            variant: "destructive",
          });
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchDocuments();

    return () => {
      mounted = false;
    };
  }, [loadId]);

  const handleDownload = async (doc: LoadDocument) => {
    try {
      // Crear un enlace temporal para descargar
      const link = window.document.createElement('a');
      link.href = doc.file_url;
      link.download = doc.file_name;
      link.target = '_blank';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el documento",
        variant: "destructive",
      });
    }
  };

  const handleView = (document: LoadDocument) => {
    window.open(document.file_url, '_blank');
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

  const displayDocuments = documents.slice(0, maxItems);
  const remainingCount = documents.length - maxItems;

  return (
    <div className="space-y-1">
      {displayDocuments.map((document) => (
        <div
          key={document.id}
          className="flex items-center gap-1.5 p-1.5 text-xs"
        >
          <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <Badge 
            variant="outline" 
            className={`text-xs px-1 py-0 h-4 ${documentTypeColors[document.document_type] || documentTypeColors.other}`}
          >
            {documentTypeLabels[document.document_type] || document.document_type}
          </Badge>
          <span className="truncate flex-1 text-muted-foreground" title={document.file_name}>
            {document.file_name}
          </span>
          {showActions && (
            <div className="flex gap-0.5 flex-shrink-0">
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
            </div>
          )}
        </div>
      ))}
      
      {remainingCount > 0 && (
        <div className="text-xs text-muted-foreground text-center pt-1">
          +{remainingCount} más
        </div>
      )}
    </div>
  );
}