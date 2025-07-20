import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Download, Trash2, FileCheck, Eye, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface LoadDocument {
  id: string;
  type: 'rate_confirmation' | 'driver_instructions' | 'bol' | 'load_order';
  name: string;
  fileName: string;
  fileSize?: number;
  uploadedAt: Date | string;
  url?: string;
  isRequired?: boolean;
}

interface LoadDocumentsManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  loadId: string;
  loadNumber: string;
}

const documentTypes = [
  {
    type: 'rate_confirmation' as const,
    label: 'Rate Confirmation',
    description: 'Documento del broker con tarifas y términos',
    required: true,
    color: 'destructive'
  },
  {
    type: 'driver_instructions' as const,
    label: 'Driver Instructions',
    description: 'Instrucciones específicas del broker',
    required: false,
    color: 'secondary'
  },
  {
    type: 'bol' as const,
    label: 'Bill of Lading (BOL)',
    description: 'Documento de embarque',
    required: false,
    color: 'secondary'
  },
  {
    type: 'load_order' as const,
    label: 'Load Order',
    description: 'Orden de carga generada para el conductor',
    required: false,
    color: 'default'
  }
];

export function LoadDocumentsManagementDialog({ 
  isOpen, 
  onClose, 
  loadId, 
  loadNumber 
}: LoadDocumentsManagementDialogProps) {
  const [documents, setDocuments] = useState<LoadDocument[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && loadId) {
      loadDocuments();
    }
  }, [isOpen, loadId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('load_documents')
        .select('*')
        .eq('load_id', loadId)
        .is('archived_at', null);

      if (error) throw error;

      const loadDocuments: LoadDocument[] = data.map(doc => ({
        id: doc.id,
        type: doc.document_type as LoadDocument['type'],
        name: doc.file_name,
        fileName: doc.file_name,
        fileSize: doc.file_size,
        uploadedAt: new Date(doc.created_at),
        url: doc.file_url,
        isRequired: doc.document_type === 'rate_confirmation'
      }));

      setDocuments(loadDocuments);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los documentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (type: LoadDocument['type'], files: FileList | null, isReplacement = false) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "El archivo es muy grande. Máximo 10MB permitido.",
        variant: "destructive",
      });
      return;
    }

    setUploading(type);

    try {
      // If replacing, first remove the existing document
      if (isReplacement) {
        const existingDoc = documents.find(doc => doc.type === type);
        if (existingDoc) {
          await handleRemoveDocument(existingDoc.id, false); // Don't show success toast
        }
      }

      // Create file path: load_id/document_type_timestamp.ext
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_${Date.now()}.${fileExt}`;
      const filePath = `${loadId}/${fileName}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('load-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('load-documents')
        .getPublicUrl(filePath);

      // Save document metadata to database
      const { data: docData, error: docError } = await supabase
        .from('load_documents')
        .insert({
          load_id: loadId,
          document_type: type,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          content_type: file.type,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (docError) throw docError;

      // Reload documents to get updated list
      await loadDocuments();

      toast({
        title: "Éxito",
        description: `${file.name} ${isReplacement ? 'reemplazado' : 'subido'} correctamente`,
      });

    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el documento. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveDocument = async (documentId: string, showToast = true) => {
    try {
      // Archive document in database (soft delete)
      const { error } = await supabase
        .from('load_documents')
        .update({ 
          archived_at: new Date().toISOString(),
          archived_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', documentId);

      if (error) throw error;

      // Reload documents to get updated list
      await loadDocuments();

      if (showToast) {
        toast({
          title: "Éxito",
          description: "Documento eliminado correctamente",
        });
      }

    } catch (error) {
      console.error('Error removing document:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el documento",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  const getDocumentStatus = (type: LoadDocument['type']) => {
    const hasDoc = documents.some(doc => doc.type === type);
    const docType = documentTypes.find(dt => dt.type === type);
    
    if (hasDoc) {
      return { status: 'uploaded', color: 'default' };
    } else if (docType?.required) {
      return { status: 'required', color: 'destructive' };
    } else {
      return { status: 'optional', color: 'secondary' };
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Gestión de Documentos - Carga {loadNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {documentTypes.map((docType) => {
                const status = getDocumentStatus(docType.type);
                const uploadedDoc = documents.find(doc => doc.type === docType.type);
                
                return (
                  <Card key={docType.type} className="h-fit">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {docType.label}
                        </CardTitle>
                        <Badge variant={status.color as any}>
                          {status.status === 'uploaded' ? 'Subido' : 
                           status.status === 'required' ? 'Requerido' : 'Opcional'}
                        </Badge>
                      </div>
                      <CardDescription>
                        {docType.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {uploadedDoc ? (
                        <div className="space-y-3">
                          {/* Document Info */}
                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <FileCheck className="h-5 w-5 text-green-500 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{uploadedDoc.fileName}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{formatFileSize(uploadedDoc.fileSize)}</span>
                                <span>•</span>
                                <span>
                                  {new Date(uploadedDoc.uploadedAt).toLocaleDateString('es-ES')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => uploadedDoc.url && window.open(uploadedDoc.url, '_blank')}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                if (uploadedDoc.url) {
                                  const link = document.createElement('a');
                                  link.href = uploadedDoc.url;
                                  link.download = uploadedDoc.fileName;
                                  link.click();
                                }
                              }}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Descargar
                            </Button>
                          </div>

                          {/* Replace Document */}
                          <div className="border-t pt-3">
                            <h5 className="text-sm font-medium mb-2">Reemplazar documento</h5>
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                id={`replace-${docType.type}`}
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => handleFileUpload(docType.type, e.target.files, true)}
                                disabled={uploading === docType.type}
                              />
                              <Button 
                                variant="outline" 
                                size="sm"
                                disabled={uploading === docType.type}
                                onClick={() => {
                                  const fileInput = document.getElementById(`replace-${docType.type}`) as HTMLInputElement;
                                  fileInput?.click();
                                }}
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                {uploading === docType.type ? 'Reemplazando...' : 'Reemplazar'}
                              </Button>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción eliminará permanentemente el documento "{uploadedDoc.fileName}". 
                                      No se puede deshacer.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleRemoveDocument(uploadedDoc.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Upload New Document */
                        <div className="space-y-3">
                          <div className="text-center py-6 border-2 border-dashed border-muted rounded-lg">
                            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground mb-3">
                              Sin documento subido
                            </p>
                            <input
                              type="file"
                              id={`upload-${docType.type}`}
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleFileUpload(docType.type, e.target.files)}
                              disabled={uploading === docType.type}
                            />
                            <Button 
                              variant="outline" 
                              size="sm"
                              disabled={uploading === docType.type}
                              onClick={() => {
                                const fileInput = document.getElementById(`upload-${docType.type}`) as HTMLInputElement;
                                fileInput?.click();
                              }}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {uploading === docType.type ? 'Subiendo...' : 'Subir archivo'}
                            </Button>
                            <p className="text-xs text-muted-foreground mt-2">
                              PDF, JPG, PNG (máx. 10MB)
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}