import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { supabase } from '@/integrations/supabase/client';

// Configure PDF.js worker dynamically  
const configurePDFWorker = () => {
  try {
    // Reset any previous worker configuration
    if (pdfjs.GlobalWorkerOptions.workerSrc) {
      delete pdfjs.GlobalWorkerOptions.workerSrc;
    }
    
    // Use unpkg CDN with the exact version from the package
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
    console.log(`✅ PDF worker configured with version ${pdfjs.version}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to configure PDF worker:', error);
    // Fallback: try without worker (will use main thread)
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = '';
      console.log('⚠️ Using main thread fallback for PDF processing');
      return true;
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
      return false;
    }
  }
};

// Configure worker immediately and verify
const workerConfigured = configurePDFWorker();
console.log('PDF Worker configured successfully:', workerConfigured);

interface DocumentPreviewProps {
  documentUrl: string;
  fileName: string;
  className?: string;
  onClick?: () => void;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ 
  documentUrl, 
  fileName, 
  className = "w-full h-32",
  onClick 
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf' | 'other'>('other');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState(false);

  // Memoize PDF options to prevent unnecessary reloads
  const pdfOptions = useMemo(() => ({
    cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/standard_fonts/`
  }), []);

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
        let bucketName = 'load-documents'; // default bucket
        
        if (documentUrl.includes('/load-documents/')) {
          storageFilePath = documentUrl.split('/load-documents/')[1];
          bucketName = 'load-documents';
        } else if (documentUrl.includes('/company-documents/')) {
          storageFilePath = documentUrl.split('/company-documents/')[1];
          bucketName = 'company-documents';
        }

        // Generate signed URL for preview
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from(bucketName)
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
      return null;
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
      console.log('Attempting to render PDF preview:', { workerConfigured, pdfError, previewUrl });
      
      // Always try to render PDF first, fallback only if actual error occurs
      return (
        <div className="w-full h-full bg-white rounded overflow-hidden">
          <Document
            file={previewUrl}
            onLoadError={(error) => {
              console.error('PDF load error:', error);
              setPdfError(true);
            }}
            onLoadSuccess={() => {
              console.log('PDF loaded successfully');
              setPdfError(false);
            }}
            loading={
              <div className="flex items-center justify-center w-full h-32 bg-muted/20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-xs text-muted-foreground">Cargando PDF...</span>
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center h-full bg-muted/20">
                <FileText className="h-8 w-8 text-muted-foreground mb-1" />
                <div className="text-xs text-muted-foreground text-center">
                  Error cargando PDF
                </div>
              </div>
            }
            className="w-full h-full"
            options={pdfOptions}
          >
            <Page
              pageNumber={1}
              scale={0.5}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="w-full h-full"
              onRenderError={(error) => {
                console.error('PDF render error:', error);
                setPdfError(true);
              }}
              onRenderSuccess={() => {
                console.log('PDF page rendered successfully');
              }}
              error={
                <div className="flex flex-col items-center justify-center h-full bg-muted/20">
                  <FileText className="h-8 w-8 text-muted-foreground mb-1" />
                  <div className="text-xs text-muted-foreground text-center">
                    Error renderizando página
                  </div>
                </div>
              }
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
    <div 
      className={`${className} border border-border/40 rounded overflow-hidden bg-background ${
        onClick ? 'cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200' : ''
      }`}
      onClick={onClick}
      title={onClick ? 'Click para ver el documento' : undefined}
    >
      {renderPreview()}
    </div>
  );
};

export default DocumentPreview;