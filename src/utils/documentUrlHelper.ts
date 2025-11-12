import { supabase } from '@/integrations/supabase/client';

/**
 * Generates a signed URL for a private document in storage
 * @param filePath - The path to the file in storage (e.g., "company_id/load_id/filename.pdf")
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns The signed URL or null if error
 */
export async function getSignedDocumentUrl(
  filePath: string, 
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    // Remove any leading slashes and "load-documents/" prefix if present
    const cleanPath = filePath
      .replace(/^\/+/, '')
      .replace(/^load-documents\//, '');

    const { data, error } = await supabase.storage
      .from('load-documents')
      .createSignedUrl(cleanPath, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data?.signedUrl || null;
  } catch (error) {
    console.error('Unexpected error creating signed URL:', error);
    return null;
  }
}

/**
 * Extracts the storage path from a full URL or returns the path as-is
 * @param urlOrPath - Full URL or storage path
 * @returns Clean storage path without company_id prefix
 */
export function extractStoragePath(urlOrPath: string): string {
  // If it's already a clean path without protocol, handle it
  if (!urlOrPath.includes('http://') && !urlOrPath.includes('https://')) {
    const cleanPath = urlOrPath.replace(/^\/+/, '');
    // Remove company_id if present (UUID pattern at start)
    return cleanPath.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//, '');
  }

  // Extract path from full URL
  // Patterns to match:
  // 1. /storage/v1/object/public/load-documents/...
  // 2. /storage/v1/object/sign/load-documents/...
  // 3. /load-documents/...
  
  let extractedPath = '';
  
  if (urlOrPath.includes('/storage/v1/object/')) {
    const parts = urlOrPath.split('/load-documents/');
    if (parts.length > 1) {
      extractedPath = parts[1].split('?')[0]; // Remove any query params
    }
  } else if (urlOrPath.includes('/load-documents/')) {
    const parts = urlOrPath.split('/load-documents/');
    if (parts.length > 1) {
      extractedPath = parts[1].split('?')[0];
    }
  } else {
    // If no pattern matched, try to extract everything after the last /load-documents/
    const match = urlOrPath.match(/load-documents\/(.+?)(\?|$)/);
    if (match && match[1]) {
      extractedPath = match[1];
    }
  }

  // Remove company_id if present at the beginning (UUID pattern)
  if (extractedPath) {
    return extractedPath.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//, '');
  }

  // Return original if no pattern matched
  return urlOrPath.replace(/^\/+/, '');
}

/**
 * Downloads a document file with proper authorization
 * @param filePath - Storage path to the file
 * @param fileName - Name for the downloaded file
 */
export async function downloadDocument(
  filePath: string,
  fileName: string
): Promise<void> {
  try {
    const cleanPath = extractStoragePath(filePath);
    
    const { data, error } = await supabase.storage
      .from('load-documents')
      .download(cleanPath);

    if (error) {
      console.error('Error downloading document:', error);
      throw new Error('Error al descargar el documento');
    }

    if (!data) {
      throw new Error('No se recibieron datos del documento');
    }

    // Create blob URL and trigger download
    const blobUrl = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up blob URL
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
  } catch (error) {
    console.error('Error in downloadDocument:', error);
    throw error;
  }
}
