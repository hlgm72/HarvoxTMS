import React, { useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { supabase } from '@/integrations/supabase/client';

// Configure PDF.js worker with proper error handling
const configurePDFWorker = () => {
  try {
    // Method 1: Try the modern approach first
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();
    console.log('✅ PDF worker configured with .mjs file');
    return true;
  } catch (error) {
    console.warn('⚠️ Failed to configure .mjs worker, trying CDN fallback:', error);
    
    try {
      // Fallback to CDN
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
      console.log('✅ PDF worker configured with CDN fallback');
      return true;
    } catch (fallbackError) {
      console.error('❌ Failed to configure PDF worker:', fallbackError);
      return false;
    }
  }
};

// Configure worker immediately
const workerConfigured = configurePDFWorker();

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
      // If PDF worker is not configured, show fallback
      if (!workerConfigured || pdfError) {
        return (
          <div className="flex flex-col items-center justify-center h-full bg-muted/20">
            <FileText className="h-8 w-8 text-muted-foreground mb-1" />
            <div className="text-xs text-muted-foreground text-center">
              PDF Document
            </div>
          </div>
        );
      }

      // Try to render PDF with error catching
      return (
        <div className="w-full h-full bg-white rounded overflow-hidden">
          <Document
            file={previewUrl}
            onLoadError={(error) => {
              console.error('PDF load error:', error);
              setPdfError(true); // Set PDF error state instead of general error
            }}
            onLoadSuccess={() => {
              console.log('PDF loaded successfully');
              setPdfError(false);
            }}
            loading={
              <div className="flex items-center justify-center w-full h-32 bg-muted/20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            }
            className="w-full h-full"
            options={{
              cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/cmaps/`,
              cMapPacked: true,
              standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
            }}
          >
            <Page
              pageNumber={1}
              width={128}
              height={128}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="w-full h-full"
              onRenderError={(error) => {
                console.error('PDF render error:', error);
                setPdfError(true); // Set PDF error state instead of general error
              }}
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