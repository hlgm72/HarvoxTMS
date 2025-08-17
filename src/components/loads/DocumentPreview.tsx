import React, { useState, useEffect } from 'react';
import { FileText, Image as ImageIcon } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { supabase } from '@/integrations/supabase/client';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface DocumentPreviewProps {
  documentUrl: string;
  fileName: string;
  className?: string;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ 
  documentUrl, 
  fileName, 
  className = "w-full h-32" 
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf' | 'other'>('other');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPreview = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Determine file type from fileName or URL
        const extension = fileName.toLowerCase().split('.').pop();
        let detectedFileType: 'image' | 'pdf' | 'other' = 'other';
        
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
          detectedFileType = 'image';
        } else if (extension === 'pdf') {
          detectedFileType = 'pdf';
        }
        
        setFileType(detectedFileType);

        // Skip preview for non-previewable files
        if (detectedFileType === 'other') {
          setIsLoading(false);
          return;
        }

        // Handle blob URLs (temporary documents)
        if (documentUrl.startsWith('blob:')) {
          setPreviewUrl(documentUrl);
          setIsLoading(false);
          return;
        }

        // Handle Supabase storage URLs
        let storageFilePath = documentUrl;
        if (documentUrl.includes('/load-documents/')) {
          storageFilePath = documentUrl.split('/load-documents/')[1];
        }

        // Generate signed URL for preview
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from('load-documents')
          .createSignedUrl(storageFilePath, 3600);

        if (urlError) {
          console.error('Error generating preview URL:', urlError);
          setError('Error loading preview');
          return;
        }

        if (signedUrlData?.signedUrl) {
          setPreviewUrl(signedUrlData.signedUrl);
        }
      } catch (err) {
        console.error('Error loading document preview:', err);
        setError('Error loading preview');
      } finally {
        setIsLoading(false);
      }
    };

    loadPreview();
  }, [documentUrl, fileName]);

  const renderPreview = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full bg-muted/20">
          <div className="text-xs text-muted-foreground">Cargando...</div>
        </div>
      );
    }

    if (error || !previewUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-muted/20">
          <FileText className="h-8 w-8 text-muted-foreground mb-1" />
          <div className="text-xs text-muted-foreground text-center">
            {error || 'Vista previa no disponible'}
          </div>
        </div>
      );
    }

    if (fileType === 'image') {
      return (
        <img
          src={previewUrl}
          alt={fileName}
          className="w-full h-full object-cover rounded"
          onError={() => {
            setError('Error loading image');
          }}
        />
      );
    }

    if (fileType === 'pdf') {
      return (
        <div className="w-full h-full bg-white rounded overflow-hidden">
          <Document
            file={previewUrl}
            onLoadError={() => {
              setError('Error loading PDF');
            }}
            className="w-full h-full"
          >
            <Page
              pageNumber={1}
              width={200}
              height={128}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="w-full h-full"
            />
          </Document>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/20">
        <FileText className="h-8 w-8 text-muted-foreground mb-1" />
        <div className="text-xs text-muted-foreground">Vista previa no disponible</div>
      </div>
    );
  };

  return (
    <div className={`${className} border border-border/40 rounded overflow-hidden bg-background`}>
      {renderPreview()}
    </div>
  );
};

export default DocumentPreview;