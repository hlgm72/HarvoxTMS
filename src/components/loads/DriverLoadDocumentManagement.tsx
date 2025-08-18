import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Upload, Camera } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { LoadDocumentsList } from './LoadDocumentsList';
import { LoadDocumentStatusIndicator } from './LoadDocumentStatusIndicator';

interface DriverLoadDocumentManagementProps {
  loadId: string;
  loadStatus: string;
  onUploadDocument?: (documentType: string) => void;
}

// Document types drivers can upload/replace
const driverAllowedDocuments = [
  {
    type: 'bol',
    label: 'Bill of Lading (BOL)',
    shortLabel: 'BOL',
    description: 'Conocimiento de embarque'
  },
  {
    type: 'pod',
    label: 'Proof of Delivery (POD)',
    shortLabel: 'POD',
    description: 'Prueba de entrega'
  },
  {
    type: 'load_invoice',
    label: 'Load Invoice',
    shortLabel: 'LI',
    description: 'Factura de la carga'
  },
  {
    type: 'load_photos',
    label: 'Fotos de la Carga',
    shortLabel: 'FOTOS',
    description: 'Fotografías del producto/carga'
  }
];

// Check if load is closed (documents should be immutable)
const isLoadClosed = (status: string) => {
  const closedStatuses = ['completed', 'cancelled', 'archived'];
  return closedStatuses.includes(status);
};

export function DriverLoadDocumentManagement({ 
  loadId, 
  loadStatus,
  onUploadDocument
}: DriverLoadDocumentManagementProps) {
  const { isDriver } = useAuth();
  const loadClosed = isLoadClosed(loadStatus);

  // Only show this component to drivers
  if (!isDriver) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Document Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos de la Carga
            </CardTitle>
            <LoadDocumentStatusIndicator loadId={loadId} showDetails={false} />
          </div>
        </CardHeader>
        <CardContent>
          {loadClosed && (
            <div className="bg-muted/50 p-3 rounded-lg border border-muted mb-4">
              <p className="text-sm font-medium text-muted-foreground">
                ℹ️ Esta carga está cerrada. Los documentos son de solo lectura.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Driver Document Upload Actions */}
      {!loadClosed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subir Documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {driverAllowedDocuments.map((doc) => (
                <div key={doc.type} className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    {doc.type === 'load_photos' ? (
                      <Camera className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    {doc.label}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {doc.description}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUploadDocument?.(doc.type)}
                    className="w-full"
                  >
                    <Upload className="h-3 w-3 mr-2" />
                    Subir {doc.shortLabel}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents List - Read-only for drivers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documentos Subidos</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadDocumentsList 
            loadId={loadId}
            maxItems={20}
            showActions={true}
            showDeleteButton={false} // Drivers can't delete documents
            driverView={true}
          />
        </CardContent>
      </Card>

      {/* Information about restricted documents */}
      <Card className="border-muted bg-muted/10">
        <CardContent className="py-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="font-medium text-sm">Documentos Administrativos</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Puedes ver todos los documentos de la carga, pero solo puedes subir BOL, POD, facturas y fotos.
              Los documentos Rate Confirmation (RC), Load Order (LO) y Driver Instructions (DI) son gestionados por la oficina.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}