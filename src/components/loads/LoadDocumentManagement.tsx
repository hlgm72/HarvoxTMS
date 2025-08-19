import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FileText, Upload, Download, Eye, Trash2, AlertTriangle, CheckCircle, RefreshCw, Camera, FileImage } from "lucide-react";
import { useLoadDocumentValidation } from '@/hooks/useLoadDocumentValidation';
import { useLoadWorkStatus } from '@/hooks/useLoadWorkStatus';
import { LoadDocumentsList } from './LoadDocumentsList';
import { LoadDocumentStatusIndicator } from './LoadDocumentStatusIndicator';
import { validateDocumentAction, getDocumentStatusMessage } from '@/utils/loadDocumentValidation';

interface LoadDocumentManagementProps {
  loadId: string;
  loadStatus: string;
  onUploadDocument?: () => void;
  onRegenerateLoadOrder?: () => void;
  userRole?: 'admin' | 'driver';
}

export function LoadDocumentManagement({ 
  loadId, 
  loadStatus,
  onUploadDocument,
  onRegenerateLoadOrder,
  userRole = 'admin'
}: LoadDocumentManagementProps) {
  const { t } = useTranslation('loads');
  const { data: validation, isLoading: validationLoading } = useLoadDocumentValidation(loadId);
  const { data: workStatus, isLoading: workStatusLoading } = useLoadWorkStatus(loadId);
  
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    documentType?: string;
  }>({ isOpen: false });

  if (validationLoading || workStatusLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            <span className="ml-2">{t('documents.loading')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!validation || !workStatus) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          {t('documents.error_loading')}
        </CardContent>
      </Card>
    );
  }

  const statusMessage = getDocumentStatusMessage(
    validation.hasLoadOrder,
    validation.hasRateConfirmation,
    workStatus.isInProgress
  );

  const isLoadClosed = loadStatus === 'delivered_completed' || loadStatus === 'closed';
  const isDriver = userRole === 'driver';
  
  // Driver restrictions
  const canUploadRC = !isDriver && !isLoadClosed; // Solo admins pueden subir RC
  const canUploadLO = !isDriver && !isLoadClosed; // Solo admins pueden generar LO
  const canReplaceRC = !isDriver && workStatus.canReplaceRateConfirmation && !isLoadClosed;
  const canRegenerateLO = !isDriver && workStatus.canRegenerateLoadOrder && !isLoadClosed;

  return (
    <div className="space-y-4">
      {/* Document Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('documents.status_title')}
            </CardTitle>
            <LoadDocumentStatusIndicator loadId={loadId} showDetails={true} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className={`p-3 rounded-lg border ${
              statusMessage.type === 'success' ? 'bg-success/10 border-success/20 text-success' :
              statusMessage.type === 'warning' ? 'bg-warning/10 border-warning/20 text-warning' :
              'bg-destructive/10 border-destructive/20 text-destructive'
            }`}>
              <p className="text-sm font-medium">{statusMessage.message}</p>
            </div>

            {/* Document Rules Information */}
            <div className="bg-muted/30 p-3 rounded-lg">
              <h4 className="font-medium text-sm mb-2">{t('documents.rules_title')}</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• {t('documents.rules.1')}</li>
                <li>• {t('documents.rules.2')}</li>
                <li>• {t('documents.rules.3')}</li>
                <li>• {t('documents.rules.4')}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Actions - Only show for admins */}
      {!isDriver && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('documents.actions_title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Rate Confirmation Actions */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Rate Confirmation
                  {validation.hasRateConfirmation && (
                     <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                       {t('documents.active')}
                     </Badge>
                   )}
                </h4>
                
                <div className="space-y-2">
                  <Button
                    variant={validation.hasRateConfirmation ? "outline" : "default"}
                    size="sm"
                    onClick={onUploadDocument}
                    disabled={!canUploadRC}
                    className="w-full"
                   >
                     <Upload className="h-3 w-3 mr-2" />
                     {validation.hasRateConfirmation ? t('validation.replace_rc') : t('validation.upload_rc')}
                  </Button>
                  
                   {validation.hasRateConfirmation && workStatus.isInProgress && (
                     <p className="text-xs text-muted-foreground">
                       ℹ️ {t('documents.info_replace')}
                    </p>
                  )}
                </div>
              </div>

              {/* Load Order Actions */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Load Order
                  {validation.hasLoadOrder && (
                     <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                       {t('documents.active')} ({t('documents.priority')})
                     </Badge>
                   )}
                </h4>
                
                <div className="space-y-2">
                  <Button
                    variant={validation.hasLoadOrder ? "outline" : "default"}
                    size="sm"
                    onClick={onRegenerateLoadOrder}
                    disabled={!canRegenerateLO}
                    className="w-full"
                   >
                     <RefreshCw className="h-3 w-3 mr-2" />
                     {validation.hasLoadOrder ? t('validation.regenerate_lo') : t('validation.generate_lo')}
                  </Button>
                  
                   {validation.hasLoadOrder && workStatus.isInProgress && (
                     <p className="text-xs text-muted-foreground">
                       ℹ️ {t('documents.info_regenerate')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Driver Upload Actions */}
      {isDriver && !isLoadClosed && (
        <Card>
          <CardHeader>
             <CardTitle className="text-base">{t('documents.upload_title')}</CardTitle>
           </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUploadDocument && onUploadDocument()}
                className="h-auto flex-col py-3"
              >
                <FileText className="h-4 w-4 mb-1" />
                <span className="text-xs">BOL</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUploadDocument && onUploadDocument()}
                className="h-auto flex-col py-3"
              >
                <CheckCircle className="h-4 w-4 mb-1" />
                <span className="text-xs">POD</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUploadDocument && onUploadDocument()}
                className="h-auto flex-col py-3"
              >
                <FileText className="h-4 w-4 mb-1" />
                <span className="text-xs">Factura</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUploadDocument && onUploadDocument()}
                className="h-auto flex-col py-3"
              >
                <Camera className="h-4 w-4 mb-1" />
                <span className="text-xs">Fotos</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      <Card>
         <CardHeader>
           <CardTitle className="text-base">{t('documents.uploaded_title')}</CardTitle>
         </CardHeader>
        <CardContent>
          <LoadDocumentsList 
            loadId={loadId}
            maxItems={10}
            showActions={true}
            showDeleteButton={!isDriver}
            userRole={userRole}
          />
        </CardContent>
      </Card>

      {/* Protection Warnings */}
      {workStatus.isInProgress && !isDriver && (
        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="py-4">
             <div className="flex items-center gap-2 text-warning">
               <AlertTriangle className="h-4 w-4" />
               <span className="font-medium text-sm">{t('documents.protected_documents')}</span>
             </div>
             <p className="text-xs text-muted-foreground mt-1">
               {t('documents.protection_warning')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Driver Load Closed Warning */}
      {isDriver && isLoadClosed && (
        <Card className="border-muted bg-muted/30">
           <CardContent className="py-4">
             <div className="flex items-center gap-2 text-muted-foreground">
               <CheckCircle className="h-4 w-4" />
               <span className="font-medium text-sm">{t('documents.load_completed')}</span>
             </div>
             <p className="text-xs text-muted-foreground mt-1">
               {t('documents.completion_warning')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}