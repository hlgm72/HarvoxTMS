import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Download, Trash2, FileCheck, Plus } from "lucide-react";
import { GenerateLoadOrderDialog } from "./GenerateLoadOrderDialog";

interface LoadDocument {
  id: string;
  type: 'rate_confirmation' | 'driver_instructions' | 'bol' | 'load_order';
  name: string;
  fileName: string;
  fileSize?: number;
  uploadedAt: Date;
  url?: string;
  isRequired?: boolean;
}

interface LoadDocumentsSectionProps {
  loadData: {
    load_number: string;
    total_amount: number;
    commodity: string;
    weight_lbs?: number;
    broker_name?: string;
    driver_name?: string;
    loadStops: any[];
  };
  onDocumentsChange?: (documents: LoadDocument[]) => void;
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
  }
];

export function LoadDocumentsSection({ loadData, onDocumentsChange }: LoadDocumentsSectionProps) {
  const [documents, setDocuments] = useState<LoadDocument[]>([]);
  const [showGenerateLoadOrder, setShowGenerateLoadOrder] = useState(false);
  const [hasLoadOrder, setHasLoadOrder] = useState(false);

  const handleFileUpload = (type: LoadDocument['type'], files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const newDocument: LoadDocument = {
      id: crypto.randomUUID(),
      type,
      name: documentTypes.find(dt => dt.type === type)?.label || type,
      fileName: file.name,
      fileSize: file.size,
      uploadedAt: new Date(),
      isRequired: type === 'rate_confirmation'
    };

    const updatedDocuments = [...documents, newDocument];
    setDocuments(updatedDocuments);
    onDocumentsChange?.(updatedDocuments);
  };

  const handleRemoveDocument = (documentId: string) => {
    const updatedDocuments = documents.filter(doc => doc.id !== documentId);
    setDocuments(updatedDocuments);
    onDocumentsChange?.(updatedDocuments);
  };

  const handleLoadOrderGenerated = (loadOrderData: any) => {
    const loadOrderDocument: LoadDocument = {
      id: crypto.randomUUID(),
      type: 'load_order',
      name: 'Load Order',
      fileName: `Load_Order_${loadData.load_number}.pdf`,
      uploadedAt: new Date(),
      url: loadOrderData.url
    };

    const updatedDocuments = [...documents, loadOrderDocument];
    setDocuments(updatedDocuments);
    setHasLoadOrder(true);
    onDocumentsChange?.(updatedDocuments);
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Documentos de la Carga
        </CardTitle>
        <CardDescription>
          Sube los documentos necesarios para la carga. El Load Order se puede generar automáticamente con información personalizada.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Document Upload Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Documentos a subir</h4>
          
          {documentTypes.map((docType) => {
            const status = getDocumentStatus(docType.type);
            const uploadedDoc = documents.find(doc => doc.type === docType.type);
            
            return (
              <div key={docType.type} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-medium">{docType.label}</h5>
                      <Badge variant={status.color as any}>
                        {status.status === 'uploaded' ? 'Subido' : 
                         status.status === 'required' ? 'Requerido' : 'Opcional'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {docType.description}
                    </p>
                    
                    {uploadedDoc ? (
                      <div className="flex items-center gap-2 text-sm">
                        <FileCheck className="h-4 w-4 text-green-500" />
                        <span>{uploadedDoc.fileName}</span>
                        {uploadedDoc.fileSize && (
                          <span className="text-muted-foreground">
                            ({formatFileSize(uploadedDoc.fileSize)})
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileUpload(docType.type, e.target.files)}
                          />
                          <Button variant="outline" size="sm">
                            <Upload className="h-4 w-4 mr-2" />
                            Subir archivo
                          </Button>
                        </label>
                        <span className="text-xs text-muted-foreground">
                          PDF, JPG, PNG (máx. 10MB)
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {uploadedDoc && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleRemoveDocument(uploadedDoc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Load Order Generation Section */}
        <div className="border-t pt-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium mb-1">Load Order Personalizado</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Genera un Load Order con información personalizada para el conductor. 
                Este documento puede tener un monto diferente al Rate Confirmation original.
              </p>
              
              {hasLoadOrder ? (
                <div className="flex items-center gap-2 text-sm">
                  <FileCheck className="h-4 w-4 text-green-500" />
                  <span>Load Order generado</span>
                  <Badge variant="default">Documento principal para el conductor</Badge>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Sin Load Order generado - El conductor verá el Rate Confirmation original
                </div>
              )}
            </div>
            
            <Button 
              onClick={() => setShowGenerateLoadOrder(true)}
              variant={hasLoadOrder ? "secondary" : "default"}
            >
              <Plus className="h-4 w-4 mr-2" />
              {hasLoadOrder ? 'Regenerar Load Order' : 'Generar Load Order'}
            </Button>
          </div>
        </div>

        {/* Documents Summary */}
        {documents.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Resumen de documentos ({documents.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded">
                  <FileText className="h-4 w-4" />
                  <span className="truncate">{doc.fileName}</span>
                  {doc.type === 'load_order' && (
                    <Badge variant="default" className="ml-auto text-xs">
                      Principal
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Generate Load Order Dialog */}
      <GenerateLoadOrderDialog
        isOpen={showGenerateLoadOrder}
        onClose={() => setShowGenerateLoadOrder(false)}
        loadData={loadData}
        onLoadOrderGenerated={handleLoadOrderGenerated}
      />
    </Card>
  );
}