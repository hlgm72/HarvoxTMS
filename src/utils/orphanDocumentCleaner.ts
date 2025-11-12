import { supabase } from '@/integrations/supabase/client';
import { extractStoragePath } from './documentUrlHelper';

/**
 * Verifies if a file exists in Supabase Storage
 * @param filePath - Storage path to the file
 * @param bucketName - Name of the storage bucket
 * @returns true if file exists, false otherwise
 */
export async function fileExistsInStorage(
  filePath: string,
  bucketName: string = 'load-documents'
): Promise<boolean> {
  try {
    const cleanPath = extractStoragePath(filePath);
    
    // Try to get file metadata - if it exists, this will succeed
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(cleanPath.split('/').slice(0, -1).join('/'), {
        search: cleanPath.split('/').pop()
      });

    if (error) {
      console.error('Error checking file existence:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Unexpected error checking file existence:', error);
    return false;
  }
}

/**
 * Removes orphaned document reference from database
 * @param documentId - ID of the document to remove
 * @returns true if successful, false otherwise
 */
export async function removeOrphanedDocument(documentId: string): Promise<boolean> {
  try {
    console.log('🧹 Removing orphaned document reference:', documentId);
    
    const { error } = await supabase
      .from('load_documents')
      .delete()
      .eq('id', documentId);

    if (error) {
      console.error('Error removing orphaned document:', error);
      return false;
    }

    console.log('✅ Orphaned document reference removed successfully');
    return true;
  } catch (error) {
    console.error('Unexpected error removing orphaned document:', error);
    return false;
  }
}

/**
 * Validates document existence and removes orphaned references
 * @param documentId - ID of the document to validate
 * @param fileUrl - URL of the file in storage
 * @param bucketName - Name of the storage bucket
 * @returns true if document is valid, false if it was orphaned and removed
 */
export async function validateAndCleanDocument(
  documentId: string,
  fileUrl: string,
  bucketName: string = 'load-documents'
): Promise<boolean> {
  const exists = await fileExistsInStorage(fileUrl, bucketName);
  
  if (!exists) {
    console.warn('⚠️ Orphaned document detected:', { documentId, fileUrl });
    await removeOrphanedDocument(documentId);
    return false;
  }
  
  return true;
}
