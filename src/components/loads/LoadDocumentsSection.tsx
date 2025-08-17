import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FileText, Upload, Download, Trash2, FileCheck, Plus, Eye, RotateCcw } from "lucide-react";
import { GenerateLoadOrderDialog } from "./GenerateLoadOrderDialog";
import { LoadDocumentValidationIndicator } from "./LoadDocumentValidationIndicator";
import { supabase } from "@/integrations/supabase/client";
import { useFleetNotifications } from "@/components/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useLoadDocuments } from "@/contexts/LoadDocumentsContext";

interface LoadDocument {
  id: string;
  type: 'rate_confirmation' | 'driver_instructions' | 'bol' | 'load_order' | 'pod' | 'load_invoice';
  name: string;
  fileName: string;
  fileSize?: number;
  uploadedAt: Date | string;
  url: string;
}

interface LoadDocumentsSectionProps {
  loadId?: string;
  loadNumber?: string; // Added for backward compatibility
  loadData?: any;
  documents?: LoadDocument[];
  temporaryDocuments?: LoadDocument[];
  onDocumentsChange?: (documents: LoadDocument[]) => void;
  onTemporaryDocumentsChange?: (documents: LoadDocument[]) => void;
  isDialogMode?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void; // Added for backward compatibility
  isOpen?: boolean;
  wizardMode?: boolean;
  canGenerate?: boolean;
  showGenerateButton?: boolean;
}

const documentTypes = [
  {
    type: 'rate_confirmation' as const,
    label: 'Rate Confirmation',
    description: 'Confirmación de tarifa del broker',
    required: true,
    generated: false,
    gridPosition: 'row1-col1'
  },
  {
    type: 'driver_instructions' as const,
    label: 'Driver Instructions',
    description: 'Instrucciones específicas para el conductor',
    required: false,
    generated: false,
    gridPosition: 'row1-col2'
  },
  {
    type: 'bol' as const,
    label: 'Bill of Lading',
    description: 'Documento de embarque',
    required: false,
    generated: false,
    gridPosition: 'row2-col1'
  },
  {
    type: 'pod' as const,
    label: 'POD (Proof of Delivery)',
    description: 'Prueba de entrega',
    required: true,
    generated: false,
    gridPosition: 'row2-col2'
  },
  {
    type: 'load_order' as const,
    label: 'Load Order',
    description: 'Orden de carga generada automáticamente',
    required: false,
    generated: true,
    gridPosition: 'row3-col1'
  },
  {
    type: 'load_invoice' as const,
    label: 'Load Invoice',
    description: 'Factura de la carga',
    required: false,
    generated: false,
    gridPosition: 'row3-col2'
  }
];

// Helper function to generate standardized file names
const generateDocumentFileName = (loadNumber: string, documentType: string, originalFileName: string, otherDocCount?: number): string => {
  const cleanLoadNumber = loadNumber.replace('#', '').replace('-', '-');
  let docTypeName = '';
  
  switch (documentType) {
    case 'rate_confirmation':
      docTypeName = 'Rate_Confirmation';
      break;
    case 'driver_instructions':
      docTypeName = 'Driver_Instructions';
      break;
    case 'bol':
      docTypeName = 'Bill_of_Lading';
      break;
    case 'pod':
      docTypeName = 'Proof_of_Delivery';
      break;
    case 'load_order':
      docTypeName = 'Load_Order';
      break;
    case 'load_invoice':
      docTypeName = 'Load_Invoice';
      break;
    default:
      // For other documents, use a counter system
      const counter = otherDocCount ? otherDocCount + 1 : 1;
      docTypeName = `Other_Document_${counter}`;
      break;
  }
  
  const fileExtension = originalFileName.split('.').pop();
  return `${cleanLoadNumber}_${docTypeName}.${fileExtension}`;
};

// Helper function to check if load order can be generated
const canGenerateLoadOrder = (loadData: any): boolean => {
  if (!loadData) return false;
  
  // Check basic load information
  const hasBasicInfo = !!(
    loadData.load_number &&
    loadData.commodity &&
    loadData.total_amount &&
    loadData.pickup_date &&
    loadData.delivery_date
  );
  
  // Check if load has stops (should have at least pickup and delivery)
  const hasStops = loadData.stops && loadData.stops.length >= 2;
  
  // Check if stops have required information
  const stopsHaveInfo = hasStops && loadData.stops.every((stop: any) => 
    stop.company_name && 
    stop.address && 
    stop.city && 
    stop.state
  );
  
  return hasBasicInfo && hasStops && stopsHaveInfo;
};

export function LoadDocumentsSection({
  loadId,
  loadData,
  documents: propDocuments = [],
  temporaryDocuments = [],
  onDocumentsChange,
  onTemporaryDocumentsChange,
  isDialogMode = false,
  onOpenChange,
  onClose,
  isOpen = false,
  wizardMode = false,
  canGenerate = false,
  showGenerateButton = false
}: LoadDocumentsSectionProps) {
  const [documents, setDocuments] = useState<LoadDocument[]>(propDocuments);
  const [uploadingDocuments, setUploadingDocuments] = useState<Set<string>>(new Set());
  const [removingDocuments, setRemovingDocuments] = useState<Set<string>>(new Set());
  const [showGenerateLoadOrder, setShowGenerateLoadOrder] = useState(false);
  const [hasLoadOrder, setHasLoadOrder] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();
  const { notifyDocumentChange } = useLoadDocuments();

  // Check if Load Order exists
  useEffect(() => {
    const loadOrderExists = [...documents, ...temporaryDocuments].some(doc => doc.type === 'load_order');
    setHasLoadOrder(loadOrderExists);
  }, [documents, temporaryDocuments]);

  // Load documents from database when loadId changes
  useEffect(() => {
    if (loadId && loadId !== 'temp' && !wizardMode) {
      loadDocuments();
    }
  }, [loadId, wizardMode]);

  // Update local state when prop documents change
  useEffect(() => {
    if (propDocuments && propDocuments.length !== documents.length) {
      setDocuments(propDocuments);
    }
  }, [propDocuments.length]);

  const loadDocuments = async () => {
    if (!loadId || loadId === 'temp') return;

    try {
      console.log('🔄 LoadDocumentsSection - Loading documents for load:', loadId);
      
      // Use the secure function to load documents
      const { data: loadDocuments, error } = await supabase.rpc('get_load_documents_with_validation', {
        target_load_id: loadId
      });

      if (error) {
        console.error('❌ LoadDocumentsSection - Error loading documents:', error);
        throw error;
      }

      console.log('✅ LoadDocumentsSection - Documents loaded:', loadDocuments?.length || 0);
      console.log('📄 LoadDocumentsSection - Document details:', loadDocuments);

      const formattedDocuments: LoadDocument[] = (loadDocuments || []).map(doc => ({
        id: doc.id,
        type: doc.document_type as LoadDocument['type'],
        name: documentTypes.find(dt => dt.type === doc.document_type)?.label || doc.document_type,
        fileName: doc.file_name,
        fileSize: doc.file_size || undefined,
        uploadedAt: doc.created_at,
        url: doc.file_url
      }));

      console.log('📋 LoadDocumentsSection - Formatted documents:', formattedDocuments);
      setDocuments(formattedDocuments);
      onDocumentsChange?.(formattedDocuments);
    } catch (error) {
      console.error('Error loading documents:', error);
      showError("Error", "No se pudieron cargar los documentos");
    }
  };

  const handleFileUpload = async (file: File, documentType: LoadDocument['type'], isReplacement = false) => {
    if (!loadId || loadId === 'temp') {
      return handleTemporaryFileUpload(file, documentType);
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      showError("Error", "El archivo es muy grande. Máximo 10MB permitido.");
      return;
    }

    setUploading(documentType);
    setUploadingDocuments(prev => new Set([...prev, documentType]));

    try {
      console.log('🔄 LoadDocumentsSection - Starting file upload:', {
        fileName: file.name,
        fileSize: file.size,
        documentType,
        loadId,
        isReplacement
      });

      // Get user info for folder structure
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Usuario no autenticado');
      }

      // Generate standardized file name based on load number and document type
      const loadNumber = loadData?.load_number || loadId;
      const standardFileName = generateDocumentFileName(loadNumber, documentType, file.name);
      const filePath = `${user.id}/${loadId}/${standardFileName}`;

      console.log('📁 LoadDocumentsSection - Upload path:', filePath);

      // If it's a replacement, find and remove the old document
      let existingDocId = null;
      if (isReplacement) {
        const existingDoc = documents.find(doc => doc.type === documentType);
        if (existingDoc) {
          existingDocId = existingDoc.id;
          
          // Extract storage path from URL correctly
          let oldFilePath = existingDoc.url;
          console.log('🗑️ LoadDocumentsSection - Original URL to delete:', existingDoc.url);
          
          // Handle different URL formats
          if (existingDoc.url.includes('supabase.co/storage/v1/object/public/load-documents/')) {
            // Extract everything after the bucket name for public URLs
            const parts = existingDoc.url.split('/load-documents/');
            if (parts.length > 1) {
              oldFilePath = parts[1];
            }
          } else if (existingDoc.url.includes('/')) {
            // If it's already a storage path, use it as is
            oldFilePath = existingDoc.url;
          }
          
          console.log('🗑️ LoadDocumentsSection - Storage path to delete:', oldFilePath);
          
          // Remove old file from storage
          const { error: deleteError } = await supabase.storage
            .from('load-documents')
            .remove([oldFilePath]);
            
          if (deleteError) {
            console.error('❌ LoadDocumentsSection - Error deleting old file from storage:', deleteError);
            // Don't throw error here, continue with upload even if delete fails
          } else {
            console.log('✅ LoadDocumentsSection - Successfully deleted old file from storage');
          }
        }
      }

      // Upload file to Supabase Storage with upsert to handle existing files
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('load-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true  // Allow overwriting existing files
        });

      if (uploadError) {
        console.error('❌ LoadDocumentsSection - Storage upload error:', uploadError);
        throw new Error(`Error subiendo archivo: ${uploadError.message}`);
      }

      console.log('✅ LoadDocumentsSection - File uploaded to storage:', uploadData.path);

      // Get public URL
      // Use the storage path instead of public URL for private bucket
      const storagePath = uploadData.path;
      console.log('🔗 LoadDocumentsSection - Storage path:', storagePath);

      // Save document info to database
      const documentData = {
        load_id: loadId,
        document_type: documentType,
        file_name: standardFileName, // Use the standardized file name instead of original
        file_size: file.size,
        file_url: storagePath, // Store the storage path instead of public URL
        uploaded_by: user.id
      };

      console.log('📝 LoadDocumentsSection - About to insert document data:', {
        documentData,
        userId: user.id,
        loadId,
        isReplacement,
        existingDocId
      });

      let result;
      // Use the correct function with the new parameter signature
      result = await supabase.rpc('create_or_update_load_document_with_validation', {
        document_data: documentData,
        document_id: isReplacement && existingDocId ? existingDocId : null
      });

      if (result.error) {
        console.error('❌ LoadDocumentsSection - Database insert error:', {
          error: result.error,
          code: result.error.code,
          message: result.error.message,
          details: result.error.details,
          hint: result.error.hint,
          documentData
        });
        throw result.error;
      }

      console.log('✅ LoadDocumentsSection - Document saved to database:', result.data);

      // Extract document data from function response
      const documentResult = result.data.document;

      const newDocument: LoadDocument = {
        id: documentResult.id,
        type: documentType,
        name: documentTypes.find(dt => dt.type === documentType)?.label || documentType,
        fileName: documentResult.file_name,
        fileSize: documentResult.file_size,
        uploadedAt: documentResult.created_at,
        url: documentResult.file_url
      };

      // Update documents list
      let updatedDocuments;
      if (isReplacement) {
        updatedDocuments = documents.map(doc => 
          doc.type === documentType ? newDocument : doc
        );
      } else {
        updatedDocuments = [...documents, newDocument];
      }

      setDocuments(updatedDocuments);
      onDocumentsChange?.(updatedDocuments);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['load-documents', loadId] });
      queryClient.invalidateQueries({ queryKey: ['load-document-validation', loadId] });
      
      // Notify context about the change
      notifyDocumentChange();

      showSuccess("Éxito", `${newDocument.name} subido correctamente`);

    } catch (error) {
      console.error('Error uploading document:', error);
      showError("Error", "No se pudo subir el documento. Intenta nuevamente.");
    } finally {
      setUploading(null);
      setUploadingDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentType);
        return newSet;
      });
    }
  };

  const handleTemporaryFileUpload = async (file: File, documentType: LoadDocument['type']) => {
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      showError("Error", "El archivo es demasiado grande. Máximo 50MB.");
      return;
    }

    setUploading(documentType);

    try {
      // Create a temporary document that will be saved later
      const tempDocument: LoadDocument = {
        id: crypto.randomUUID(),
        type: documentType,
        name: documentTypes.find(dt => dt.type === documentType)?.label || documentType,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date(),
        url: URL.createObjectURL(file) // Temporary URL
      };

      // Add file reference for later upload
      (tempDocument as any).file = file;

      // Update temporary documents
      const updatedTempDocs = [...temporaryDocuments, tempDocument];
      onTemporaryDocumentsChange?.(updatedTempDocs);

      // Also add to local documents for display
      const updatedDocuments = [...documents, tempDocument];
      setDocuments(updatedDocuments);
      onDocumentsChange?.(updatedDocuments);

      showSuccess("Documento agregado", `${file.name} se subirá cuando guardes la carga.`);
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveTemporaryDocument = (documentId: string) => {
    const updatedTempDocs = temporaryDocuments.filter(doc => doc.id !== documentId);
    onTemporaryDocumentsChange?.(updatedTempDocs);
    
    showSuccess("Documento removido", "El documento temporal ha sido eliminado.");
  };

  const handleRemoveDocument = async (documentId: string) => {
    if (!loadId || loadId === 'temp') {
      // Handle removal of temporary document
      const docToRemove = documents.find(doc => doc.id === documentId);
      if (docToRemove) {
        URL.revokeObjectURL(docToRemove.url); // Clean up blob URL
        const updatedDocuments = documents.filter(doc => doc.id !== documentId);
        setDocuments(updatedDocuments);
        onDocumentsChange?.(updatedDocuments);
        handleRemoveTemporaryDocument(documentId);
      }
      return;
    }

    setRemovingDocuments(prev => new Set([...prev, documentId]));

    try {
      // Get document info using the secure function (bypasses RLS)
      const { data: allDocuments, error: fetchError } = await supabase.rpc('get_load_documents_with_validation', {
        target_load_id: loadId
      });

      if (fetchError) {
        throw fetchError;
      }

      // Find the specific document to remove
      const documentData = allDocuments?.find(doc => doc.id === documentId);

      if (!documentData) {
        // Remove orphaned record from local state
        const updatedDocuments = documents.filter(doc => doc.id !== documentId);
        setDocuments(updatedDocuments);
        onDocumentsChange?.(updatedDocuments);

        // Invalidate queries and notify context
        queryClient.invalidateQueries({ queryKey: ['load-documents', loadId] });
        notifyDocumentChange();

        showSuccess("Registro eliminado", "El registro huérfano ha sido eliminado de la lista");
        return;
      }

      // Check if file exists in storage before attempting removal
      if (documentData.file_url) {
        try {
          const urlPath = new URL(documentData.file_url).pathname;
          const filePath = urlPath.split('/load-documents/')[1]; // Extract the path after /load-documents/
          if (filePath) {
            // Check if file exists in storage by trying to download it (more reliable than list)
            const { data: fileData, error: downloadError } = await supabase.storage
              .from('load-documents')
              .download(filePath);

            if (!downloadError && fileData) {
              // File exists, remove it
              const { error: storageError } = await supabase.storage
                .from('load-documents')
                .remove([filePath]);

              if (storageError) {
                // Continue with database removal even if storage fails
              }
            } else {
              showSuccess("Información", "El archivo ya no existe en el almacenamiento, eliminando solo el registro de la base de datos");
            }
          }
        } catch (urlError) {
          // Continue with database removal even if storage fails
        }
      }

      // Remove from database using ACID function (bypasses RLS)
      console.log('🗑️ LoadDocumentsSection - Removing document from database using ACID function:', documentId);
      const { data: deleteResult, error: dbError } = await supabase.rpc(
        'delete_load_document_with_validation',
        { document_id_param: documentId }
      );

      if (dbError) {
        console.error('❌ LoadDocumentsSection - ACID deletion failed:', dbError);
        throw dbError;
      }

      if (!deleteResult || typeof deleteResult !== 'object' || !('success' in deleteResult) || !(deleteResult as any).success) {
        throw new Error('La operación de eliminación ACID no fue exitosa');
      }

      console.log('✅ LoadDocumentsSection - Document removed successfully from database using ACID function');

      // Update local state immediately
      const updatedDocuments = documents.filter(doc => doc.id !== documentId);
      console.log('📝 LoadDocumentsSection - Updating local state. Before:', documents.length, 'After:', updatedDocuments.length);
      setDocuments(updatedDocuments);
      onDocumentsChange?.(updatedDocuments);

      // Invalidate queries and notify context
      queryClient.invalidateQueries({ queryKey: ['load-documents', loadId] });
      queryClient.invalidateQueries({ queryKey: ['load-document-validation', loadId] });
      notifyDocumentChange();

      showSuccess("Éxito", "Documento eliminado correctamente del Storage y base de datos");

    } catch (error) {
      console.error('Error removing document:', error);
      showError("Error", "No se pudo eliminar el documento");
    } finally {
      setRemovingDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  const handleLoadOrderGenerated = async (loadOrderData: { url: string; fileName: string }) => {
    console.log('🔄 LoadDocumentsSection - Processing Load Order generation:', loadOrderData);

    if (loadId && loadId !== 'temp') {
      console.log('🔄 LoadDocumentsSection - Saving Load Order to database for existing load:', loadId);
      
      try {
        // Convert blob URL to actual blob for upload
        const response = await fetch(loadOrderData.url);
        const blob = await response.blob();
        
        // Get user info for folder structure
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error('Usuario no autenticado');
        }

        // Generate standardized file name for Load Order
        const loadNumber = loadData?.load_number || loadId;
        const standardFileName = generateDocumentFileName(loadNumber, 'load_order', 'load_order.pdf');
        const filePath = `${user.id}/${loadId}/${standardFileName}`;

        console.log('📁 LoadDocumentsSection - Upload path for Load Order:', filePath);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('load-documents')
          .upload(filePath, blob, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('❌ LoadDocumentsSection - Storage upload error for Load Order:', uploadError);
          throw uploadError;
        }

        // Get public URL
        // Use the storage path instead of public URL for private bucket
        const storagePath = uploadData.path;

        // Save to database with detailed logging
        console.log('📝 LoadDocumentsSection - About to insert Load Order to database:', {
          load_id: loadId,
          document_type: 'load_order',
          file_name: loadOrderData.fileName,
          file_size: blob.size,
          file_url: storagePath, // Store the storage path instead of public URL
          user_id: user.id
        });

        const { data: dbData, error: dbError } = await supabase
          .from('load_documents')
          .insert({
            load_id: loadId,
            document_type: 'load_order',
            file_name: loadOrderData.fileName,
            file_size: blob.size,
            file_url: storagePath, // Store the storage path instead of public URL
            uploaded_by: user.id
          })
          .select()
          .single();

        if (dbError) {
          console.error('❌ LoadDocumentsSection - Database insert error for Load Order:', {
            error: dbError,
            load_id: loadId,
            user_id: user.id,
            document_type: 'load_order',
            code: dbError.code,
            message: dbError.message,
            details: dbError.details,
            hint: dbError.hint
          });
          
          // Try using the ACID function instead
          console.log('🔄 LoadDocumentsSection - Trying with ACID function...');
          try {
            const acidResult = await supabase.rpc('create_or_update_load_document_with_validation', {
              load_id_param: loadId,
              document_data: {
                document_type: 'load_order',
                file_name: loadOrderData.fileName,
                file_size: blob.size,
                file_url: storagePath, // Store the storage path instead of public URL
              },
              replace_existing: true
            });
            
            if (acidResult.error) {
              console.error('❌ LoadDocumentsSection - ACID function also failed:', acidResult.error);
            } else {
              console.log('✅ LoadDocumentsSection - ACID function succeeded:', acidResult.data);
              // Use the ACID result instead - parse the JSON response
              const responseData = typeof acidResult.data === 'string' ? JSON.parse(acidResult.data) : acidResult.data;
              const dbData = responseData.document;
              const newDocument: LoadDocument = {
                id: dbData.id,
                type: 'load_order',
                name: 'Load Order',
                fileName: dbData.file_name,
                fileSize: dbData.file_size,
                uploadedAt: dbData.created_at,
                url: dbData.file_url
              };

              const updatedDocuments = [...documents, newDocument];
              setDocuments(updatedDocuments);
              setHasLoadOrder(true);
              onDocumentsChange?.(updatedDocuments);

              // Invalidate queries and notify context
              queryClient.invalidateQueries({ queryKey: ['load-documents', loadId] });
              notifyDocumentChange();
              
              showSuccess("Load Order guardado", "El Load Order se ha guardado exitosamente usando función ACID");
              URL.revokeObjectURL(loadOrderData.url);
              return; // Exit successfully
            }
          } catch (acidError) {
            console.error('❌ LoadDocumentsSection - ACID function also failed:', acidError);
          }
          
          throw dbError;
        }

        console.log('✅ LoadDocumentsSection - Load Order saved to database:', dbData);

        // Update local state
        const newDocument: LoadDocument = {
          id: dbData.id,
          type: 'load_order',
          name: 'Load Order',
          fileName: dbData.file_name,
          fileSize: dbData.file_size,
          uploadedAt: dbData.created_at,
          url: dbData.file_url
        };

        const updatedDocuments = [...documents, newDocument];
        setDocuments(updatedDocuments);
        setHasLoadOrder(true);
        onDocumentsChange?.(updatedDocuments);

        // Invalidate queries and notify context
        queryClient.invalidateQueries({ queryKey: ['load-documents', loadId] });
        notifyDocumentChange();
        
        showSuccess("Load Order guardado", "El Load Order se ha guardado automáticamente en Storage y la base de datos");

        // Clean up the temporary blob URL
        URL.revokeObjectURL(loadOrderData.url);
        
      } catch (error) {
        console.error('❌ LoadDocumentsSection - Error saving Load Order:', error);
        showError("Error", "No se pudo guardar el Load Order. Intenta nuevamente.");
      }
    } else {
      console.log('🔄 LoadDocumentsSection - Processing temporary Load Order for wizard mode');
      
      try {
        // For temporary loads, convert blob URL to a proper blob with file size
        const response = await fetch(loadOrderData.url);
        const blob = await response.blob();
        
        const loadOrderDocument: LoadDocument = {
          id: crypto.randomUUID(),
          type: 'load_order',
          name: 'Load Order',
          fileName: `${loadData?.load_number || 'unknown'}_Load_Order.pdf`,
          fileSize: blob.size,
          uploadedAt: new Date(),
          url: loadOrderData.url
        };

        // Add file reference for later upload
        (loadOrderDocument as any).file = blob;

        // Update temporary documents
        const updatedTempDocs = [...temporaryDocuments, loadOrderDocument];
        onTemporaryDocumentsChange?.(updatedTempDocs);

        const updatedDocuments = [...documents, loadOrderDocument];
        setDocuments(updatedDocuments);
        setHasLoadOrder(true);
        onDocumentsChange?.(updatedDocuments);
        
        showSuccess("Load Order generado", `Load Order creado (${(blob.size / 1024 / 1024).toFixed(2)} MB). Se guardará al crear la carga.`);
        
      } catch (error) {
        console.error('❌ Error processing temporary Load Order:', error);
        // Fallback without file size
        const loadOrderDocument: LoadDocument = {
          id: crypto.randomUUID(),
          type: 'load_order',
          name: 'Load Order',
          fileName: `${loadData?.load_number || 'unknown'}_Load_Order.pdf`,
          uploadedAt: new Date(),
          url: loadOrderData.url
        };

        const updatedTempDocs = [...temporaryDocuments, loadOrderDocument];
        onTemporaryDocumentsChange?.(updatedTempDocs);

        const updatedDocuments = [...documents, loadOrderDocument];
        setDocuments(updatedDocuments);
        setHasLoadOrder(true);
        onDocumentsChange?.(updatedDocuments);
        
        showSuccess("Load Order generado", "Load Order creado. Se guardará al crear la carga.");
      }
    }

    setShowGenerateLoadOrder(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, documentType: LoadDocument['type']) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showError("Error", "El archivo es muy grande. Máximo 10MB permitido.");
      return;
    }

    const existingDoc = documents.find(doc => doc.type === documentType);
    const isReplacement = !!existingDoc;

    handleFileUpload(file, documentType, isReplacement);
    
    // Reset the input
    event.target.value = '';
  };

  const handleReplaceDocument = (event: React.ChangeEvent<HTMLInputElement>, documentType: LoadDocument['type']) => {
    const file = event.target.files?.[0];
    if (!file) return;

    handleFileUpload(file, documentType, true);
    
    // Reset the input
    event.target.value = '';
  };

  const renderDocumentManagement = () => {
    const allDocuments = [...documents, ...temporaryDocuments];
    
    // Group documents by grid position
    const row1Docs = documentTypes.filter(doc => doc.gridPosition?.startsWith('row1'));
    const row2Docs = documentTypes.filter(doc => doc.gridPosition?.startsWith('row2'));
    const row3Docs = documentTypes.filter(doc => doc.gridPosition === 'row3-full');
    const additionalDocs = allDocuments.filter(doc => !documentTypes.some(dt => dt.type === doc.type));
    
    const renderDocumentCard = (docType: typeof documentTypes[0]) => {
      const existingDoc = allDocuments.find(doc => doc.type === docType.type);
      const isUploading = uploadingDocuments.has(docType.type) || uploading === docType.type;
      const isRemoving = existingDoc ? removingDocuments.has(existingDoc.id) : false;

      return (
        <div key={docType.type} className="p-3 border rounded-lg bg-white space-y-2">
          {/* Line 1: Document title and required badge */}
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{docType.label}</span>
            {docType.required && <Badge variant="destructive" className="text-xs h-5">Requerido</Badge>}
            {docType.generated && existingDoc && <Badge variant="secondary" className="text-xs h-5">Generado</Badge>}
          </div>

          {/* Line 2: Document description */}
          <p className="text-xs text-muted-foreground leading-tight">{docType.description}</p>

          {/* Line 3: File name */}
          <div className="min-h-[16px]">
            {existingDoc ? (
              <span className="text-xs font-medium text-foreground">{existingDoc.fileName}</span>
            ) : (
              <span className="text-xs text-muted-foreground italic">Sin documento</span>
            )}
          </div>

          {/* Line 4: Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            {existingDoc ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      // Check if this is a blob URL (temporary document)
                      if (existingDoc.url.startsWith('blob:')) {
                        window.open(existingDoc.url, '_blank');
                        return;
                      }

                      console.log('🔍 LoadDocumentsSection - Processing URL:', existingDoc.url);

                      // Check if it's already a public URL that we can open directly
                      if (existingDoc.url.includes('supabase.co/storage/v1/object/public/')) {
                        console.log('✅ LoadDocumentsSection - Opening public URL directly:', existingDoc.url);
                        window.open(existingDoc.url, '_blank');
                        return;
                      }

                      // Extract storage path from URL if it's a full Supabase URL
                      let storageFilePath = existingDoc.url;
                      if (existingDoc.url.includes('supabase.co/storage/v1/object/')) {
                        const parts = existingDoc.url.split('/load-documents/');
                        if (parts.length > 1) {
                          storageFilePath = parts[1];
                        }
                      }
                      
                      console.log('🔍 LoadDocumentsSection - Storage path for signing:', storageFilePath);

                      // Generate signed URL for private bucket
                      const { data: signedUrlData, error: urlError } = await supabase.storage
                        .from('load-documents')
                        .createSignedUrl(storageFilePath, 3600); // 1 hour expiry

                      if (urlError) {
                        console.error('Error generating signed URL:', urlError);
                        showError("Error", "No se pudo generar el enlace para ver el documento");
                        return;
                      }

                      if (signedUrlData?.signedUrl) {
                        console.log('✅ LoadDocumentsSection - Opening signed URL:', signedUrlData.signedUrl);
                        window.open(signedUrlData.signedUrl, '_blank');
                      }
                    } catch (error) {
                      console.error('Error opening document:', error);
                      showError("Error", "No se pudo abrir el documento");
                    }
                  }}
                  disabled={isRemoving}
                  className="h-7 text-xs"
                  title="Ver documento"
                >
                  <Eye className="h-3 w-3 md:mr-0 mr-1" />
                  <span className="md:hidden">Ver</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      // Check if this is a blob URL (temporary document)
                      if (existingDoc.url.startsWith('blob:')) {
                        const response = await fetch(existingDoc.url);
                        const blob = await response.blob();
                        const blobUrl = window.URL.createObjectURL(blob);
                        
                        const link = document.createElement('a');
                        link.href = blobUrl;
                        link.download = existingDoc.fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        window.URL.revokeObjectURL(blobUrl);
                        showSuccess("Descarga iniciada", `${existingDoc.fileName} se está descargando`);
                        return;
                      }

                      // For storage documents, use the stored path directly
                      // Handle both storage paths and full URLs for backwards compatibility
                       let downloadStoragePath = existingDoc.url;
                       console.log('🔍 LoadDocumentsSection - Original download URL:', existingDoc.url);
                       
                       if (existingDoc.url.includes('/load-documents/')) {
                         // Extract storage path from full URL
                         downloadStoragePath = existingDoc.url.split('/load-documents/')[1];
                         console.log('🔍 LoadDocumentsSection - Extracted download storage path:', downloadStoragePath);
                       }
                       
                       console.log('🔍 LoadDocumentsSection - Final download storage path to use:', downloadStoragePath);

                      // Generate signed URL for private bucket
                      const { data: signedUrlData, error: urlError } = await supabase.storage
                        .from('load-documents')
                        .createSignedUrl(downloadStoragePath, 3600); // 1 hour expiry

                      if (urlError) {
                        console.error('Error generating signed URL for download:', urlError);
                        showError("Error", "No se pudo generar el enlace de descarga");
                        return;
                      }

                      if (!signedUrlData?.signedUrl) {
                        showError("Error", "No se pudo obtener la URL firmada");
                        return;
                      }

                       const response = await fetch(signedUrlData.signedUrl);
                      if (!response.ok) {
                        throw new Error('Network response was not ok');
                      }
                      
                      const blob = await response.blob();
                      const blobUrl = window.URL.createObjectURL(blob);
                      
                      const link = document.createElement('a');
                      link.href = blobUrl;
                      link.download = existingDoc.fileName;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      
                      window.URL.revokeObjectURL(blobUrl);
                      
                      showSuccess("Descarga iniciada", `${existingDoc.fileName} se está descargando`);
                    } catch (error) {
                      console.error('Error downloading document:', error);
                      showError("Error", "No se pudo descargar el documento");
                    }
                  }}
                  disabled={isRemoving}
                  className="h-7 text-xs"
                  title="Descargar documento"
                >
                  <Download className="h-3 w-3 md:mr-0 mr-1" />
                  <span className="md:hidden">Descargar</span>
                </Button>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileSelect(e, docType.type);
                    }
                    e.target.value = '';
                  }}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                  id={`replace-${docType.type}`}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      // Check if file exists in storage first
                      const urlPath = new URL(existingDoc.url).pathname;
                      const filePath = urlPath.split('/load-documents/')[1];
                      if (filePath) {
                        const { data: fileList, error: listError } = await supabase.storage
                          .from('load-documents')
                          .list(filePath.split('/').slice(0, -1).join('/') || '', {
                            search: filePath.split('/').pop()
                          });

                        if (listError || !fileList || fileList.length === 0) {
                          showError("Error", "El archivo original ya no existe. Se procederá con el reemplazo.");
                        }
                      }
                      
                      document.getElementById(`replace-${docType.type}`)?.click();
                    } catch (error) {
                      console.error('Error checking file existence for replacement:', error);
                      // Proceed with replacement anyway
                      document.getElementById(`replace-${docType.type}`)?.click();
                    }
                  }}
                  disabled={isUploading || isRemoving}
                  className="h-7 text-xs"
                  title="Reemplazar documento"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reemplazar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={isRemoving}
                      className="text-destructive hover:text-destructive h-7 text-xs"
                      title="Eliminar documento"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Eliminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción eliminará permanentemente "{existingDoc.fileName}". 
                        No se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRemoveDocument(existingDoc.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : docType.generated ? (
              <Button
                onClick={() => setShowGenerateLoadOrder(true)}
                disabled={isUploading || !canGenerateLoadOrder(loadData)}
                size="sm"
                className="h-7 text-xs"
                title={canGenerateLoadOrder(loadData) ? "Generar Load Order" : "Faltan datos de la carga o paradas para generar el Load Order"}
              >
                <FileText className="h-3 w-3 mr-1" />
                Generar Load Order
              </Button>
            ) : (
              <>
                <input
                  type="file"
                  onChange={(e) => handleFileSelect(e, docType.type)}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                  id={`upload-${docType.type}`}
                />
                <Button
                  onClick={() => document.getElementById(`upload-${docType.type}`)?.click()}
                  disabled={isUploading}
                  size="sm"
                  className="h-7 text-xs"
                >
                  <Upload className="h-3 w-3 mr-1" />
                  {isUploading ? 'Subiendo...' : 'Subir'}
                </Button>
              </>
            )}
          </div>
        </div>
      );
    };
    
    return (
      <div className="space-y-6">
        {/* Row 1: Rate Confirmation y Driver Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {row1Docs.map(renderDocumentCard)}
        </div>

        {/* Row 2: BOL y POD */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {row2Docs.map(renderDocumentCard)}
        </div>

        {/* Row 3: Load Order y Load Invoice */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documentTypes.filter(doc => doc.gridPosition?.startsWith('row3')).map(renderDocumentCard)}
        </div>

        {/* Row 4: Additional Documents */}
        {additionalDocs.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Documentos Adicionales</h3>
            <div className="grid gap-4">
              {additionalDocs.map((doc) => (
                <div key={doc.id} className="p-3 border rounded-lg bg-white space-y-2">
                  {/* Line 1: Document name and type badge */}
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{doc.name}</span>
                    <Badge variant="outline" className="text-xs h-5">Adicional</Badge>
                  </div>

                  {/* Line 2: Document type description */}
                  <p className="text-xs text-muted-foreground leading-tight">Documento adicional de la carga</p>

                  {/* Line 3: File name */}
                  <div className="min-h-[16px]">
                    <span className="text-xs font-medium text-foreground">{doc.fileName}</span>
                  </div>

                  {/* Line 4: Action buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          // Check if this is a temporary document (blob URL)
                          if (doc.url.startsWith('blob:')) {
                            // For temporary documents, open the blob URL directly
                            window.open(doc.url, '_blank');
                            return;
                          }
                          
                          // For storage documents, generate signed URL using the stored path
                          // Handle both storage paths and full URLs for backwards compatibility
                           let filePath = doc.url;
                           console.log('🔍 LoadDocumentsSection - Original view URL:', doc.url);
                           
                           if (doc.url.includes('/load-documents/')) {
                             // Extract storage path from full URL
                             filePath = doc.url.split('/load-documents/')[1];
                             console.log('🔍 LoadDocumentsSection - Extracted view storage path:', filePath);
                           }
                           
                           console.log('🔍 LoadDocumentsSection - Final view storage path to use:', filePath);
                          
                          // Generate signed URL for private bucket
                          const { data: signedUrlData, error: urlError } = await supabase.storage
                            .from('load-documents')
                            .createSignedUrl(filePath, 3600); // 1 hour expiry

                          if (urlError) {
                            console.error('Error generating signed URL:', urlError);
                            showError("Error", "No se pudo generar el enlace para ver el documento");
                            return;
                          }

                          if (signedUrlData?.signedUrl) {
                            window.open(signedUrlData.signedUrl, '_blank');
                          }
                        } catch (error) {
                          console.error('Error viewing document:', error);
                          showError("Error", "No se pudo abrir el documento");
                        }
                      }}
                      className="h-7 text-xs"
                      title="Ver documento"
                    >
                      <Eye className="h-3 w-3 md:mr-0 mr-1" />
                      <span className="md:hidden">Ver</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          // Check if this is a temporary document (blob URL)
                          if (doc.url.startsWith('blob:')) {
                            // For temporary documents, download the blob directly
                            const response = await fetch(doc.url);
                            const blob = await response.blob();
                            const blobUrl = window.URL.createObjectURL(blob);
                            
                            const link = document.createElement('a');
                            link.href = blobUrl;
                            link.download = doc.fileName;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            
                            window.URL.revokeObjectURL(blobUrl);
                            showSuccess("Descarga iniciada", `${doc.fileName} se está descargando`);
                            return;
                          }
                          
                          // For storage documents, generate signed URL using the stored path
                          // Handle both storage paths and full URLs for backwards compatibility
                          let downloadFilePath = doc.url;
                          if (doc.url.includes('/load-documents/')) {
                            // Extract storage path from full URL
                            downloadFilePath = doc.url.split('/load-documents/')[1];
                          }
                          
                          // Generate signed URL for private bucket
                          const { data: signedUrlData, error: urlError } = await supabase.storage
                            .from('load-documents')
                            .createSignedUrl(downloadFilePath, 3600); // 1 hour expiry

                          if (urlError) {
                            console.error('Error generating signed URL for download:', urlError);
                            showError("Error", "No se pudo generar el enlace de descarga");
                            return;
                          }

                          if (!signedUrlData?.signedUrl) {
                            showError("Error", "No se pudo obtener la URL firmada");
                            return;
                          }

                          const response = await fetch(signedUrlData.signedUrl);
                          const blob = await response.blob();
                          const blobUrl = window.URL.createObjectURL(blob);
                          
                          const link = document.createElement('a');
                          link.href = blobUrl;
                          link.download = doc.fileName;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          
                          window.URL.revokeObjectURL(blobUrl);
                          
                          showSuccess("Descarga iniciada", `${doc.fileName} se está descargando`);
                        } catch (error) {
                          console.error('Error downloading document:', error);
                          showError("Error", "No se pudo descargar el documento");
                        }
                      }}
                      className="h-7 text-xs"
                      title="Descargar documento"
                    >
                      <Download className="h-3 w-3 md:mr-0 mr-1" />
                      <span className="md:hidden">Descargar</span>
                    </Button>
                    <input
                      type="file"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          // For additional docs, we'll handle replacement similarly
                          handleFileSelect(e, 'bol'); // Using 'bol' as fallback type
                        }
                        e.target.value = '';
                      }}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      className="hidden"
                      id={`replace-additional-${doc.id}`}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById(`replace-additional-${doc.id}`)?.click()}
                      className="h-7 text-xs"
                      title="Reemplazar documento"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reemplazar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-destructive hover:text-destructive h-7 text-xs"
                          title="Eliminar documento"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Eliminar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará permanentemente "{doc.fileName}". 
                            No se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveDocument(doc.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload additional documents section */}
        <div className="p-4 border-2 border-dashed rounded-lg">
          <div className="text-center">
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <h3 className="text-lg font-medium mb-2">Subir Documento Adicional</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Sube cualquier documento adicional relacionado con esta carga
            </p>
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileUpload(file, 'bol', false);
                }
                e.target.value = '';
              }}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className="hidden"
              id="additional-upload"
            />
            <Button
              onClick={() => document.getElementById('additional-upload')?.click()}
              disabled={uploading === 'additional'}
              variant="outline"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading === 'additional' ? 'Subiendo...' : 'Seleccionar Archivo'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (isDialogMode) {
    return (
      <>
        <Dialog open={isOpen} onOpenChange={(open) => {
          if (!open) {
            onClose?.();
            onOpenChange?.(false);
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>
                  Documentos de la Carga {loadData?.load_number ? `#${loadData.load_number}` : ''}
                </span>
                {loadData?.id && (
                  <LoadDocumentValidationIndicator 
                    loadId={loadData.id} 
                    loadStatus={loadData.status || 'pending'}
                    compact={true}
                  />
                )}
              </DialogTitle>
            </DialogHeader>
            {renderDocumentManagement()}
          </DialogContent>
        </Dialog>

        <GenerateLoadOrderDialog
          isOpen={showGenerateLoadOrder}
          onClose={() => setShowGenerateLoadOrder(false)}
          loadData={loadData}
          onLoadOrderGenerated={(data) => handleLoadOrderGenerated({ 
            url: data.url, 
            fileName: `${loadData?.load_number || 'unknown'}_Load_Order.pdf` 
          })}
        />
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentos de la Carga
          </CardTitle>
          <CardDescription>
            Gestiona todos los documentos relacionados con esta carga
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderDocumentManagement()}
        </CardContent>
      </Card>

      <GenerateLoadOrderDialog
        isOpen={showGenerateLoadOrder}
        onClose={() => setShowGenerateLoadOrder(false)}
        loadData={loadData}
        onLoadOrderGenerated={(data) => handleLoadOrderGenerated({ 
          url: data.url, 
          fileName: `${loadData?.load_number || 'unknown'}_Load_Order.pdf` 
        })}
      />
    </>
  );
}