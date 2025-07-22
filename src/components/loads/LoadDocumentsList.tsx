import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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