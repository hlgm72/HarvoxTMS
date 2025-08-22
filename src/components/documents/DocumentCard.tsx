import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertCircle, Calendar, Download, FileText, MoreVertical, Archive, ArchiveRestore, Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useFleetNotifications } from "@/components/notifications";
import { formatExpiryDate, formatDateOnly } from '@/lib/dateFormatting';
import DocumentPreview from "@/components/loads/DocumentPreview";

interface PredefinedDocumentType {
  value: string;
  label: string;
  critical: boolean;
}

interface DocumentCategory {
  title: string;
  types: PredefinedDocumentType[];
}

interface CompanyDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  issue_date?: string;
  expires_at?: string;
  created_at: string;
  file_size?: number;
  content_type?: string;
  uploaded_by?: string;
}

interface DocumentCardProps {
  document: CompanyDocument;
  predefinedTypes: Record<string, DocumentCategory>;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
  onEdit?: (document: CompanyDocument) => void;
  getExpiryStatus: (expiresAt?: string) => string;
  isArchived?: boolean;
}

export function DocumentCard({ 
  document, 
  predefinedTypes, 
  onArchive, 
  onRestore,
  onEdit,
  getExpiryStatus,
  isArchived = false
}: DocumentCardProps) {
  const { isCompanyOwner } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  // Find document type info
  const getDocumentTypeInfo = () => {
    for (const category of Object.values(predefinedTypes)) {
      const type = category.types.find(t => t.value === document.document_type);
      if (type) return type;
    }
    return { value: document.document_type, label: document.file_name, critical: false };
  };

  const typeInfo = getDocumentTypeInfo();
  const expiryStatus = getExpiryStatus(document.expires_at);

  const getExpiryBadge = () => {
    switch (expiryStatus) {
      case "expired":
        return <Badge variant="destructive">Vencido</Badge>;
      case "expiring":
        return <Badge variant="outline" className="border-amber-500 text-amber-600">Por Vencer</Badge>;
      case "valid":
        return <Badge variant="outline" className="border-green-500 text-green-600">Vigente</Badge>;
      default:
        return null;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Tamaño desconocido";
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  const getFileIcon = () => {
    const type = document.content_type?.toLowerCase() || "";
    if (type.includes("pdf")) return "📄";
    if (type.includes("image")) return "🖼️";
    if (type.includes("word") || type.includes("doc")) return "📝";
    return "📄";
  };

  const handleDownload = () => {
    const link = window.document.createElement('a');
    link.href = document.file_url;
    link.download = document.file_name;
    link.target = '_blank';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handlePermanentDelete = async () => {
    try {
      const { data, error } = await supabase.rpc('delete_company_document_permanently', {
        document_id: document.id
      });

      if (error) {
        console.error('Error al eliminar documento:', error);
        showError(
          "Error",
          "Hubo un error al eliminar el documento"
        );
        return;
      }

      if (data && typeof data === 'object' && 'success' in data && !data.success) {
        showError(
          "Error",
          typeof data === 'object' && 'message' in data ? String(data.message) : "Error desconocido"
        );
        return;
      }

      showSuccess(
        "Documento eliminado",
        "El documento ha sido eliminado permanentemente"
      );
      
      // Refresh the parent component
      window.location.reload();
    } catch (error) {
      console.error('Error:', error);
      showError(
        "Error",
        "Hubo un error al eliminar el documento"
      );
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row">
        {/* Left side - Document Info */}
        <div className="w-full sm:w-80 lg:w-96">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">{getFileIcon()}</div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm font-medium line-clamp-2">
                    {typeInfo.label}
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-1">
                    {document.file_name}
                  </CardDescription>
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </DropdownMenuItem>
                  
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(document)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {isArchived ? (
                    onRestore && (
                      <DropdownMenuItem 
                        onClick={() => onRestore(document.id)}
                        className="text-green-600"
                      >
                        <ArchiveRestore className="h-4 w-4 mr-2" />
                        Restaurar
                      </DropdownMenuItem>
                    )
                  ) : (
                    onArchive && (
                      <DropdownMenuItem 
                        onClick={() => onArchive(document.id)}
                        className="text-amber-600"
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archivar
                      </DropdownMenuItem>
                    )
                  )}
                  
                  {isCompanyOwner && (
                    <>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem 
                            onSelect={(e) => e.preventDefault()}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar permanentemente
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar documento permanentemente?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. El documento será eliminado permanentemente 
                              de nuestros servidores y se registrará en el log de auditoría.
                              <br /><br />
                              <strong>Archivo:</strong> {document.file_name}
                              <br />
                              <strong>Tipo:</strong> {document.document_type}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handlePermanentDelete}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar permanentemente
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {typeInfo.critical && (
                <Badge variant="secondary" className="text-xs">
                  Crítico
                </Badge>
              )}
              {getExpiryBadge()}
            </div>
          </CardHeader>

          <CardContent className="pt-0 space-y-3">
            {/* Document Dates */}
            <div className="space-y-1">
              {document.issue_date && (
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Emitido: {formatDateOnly(document.issue_date)}
                  </span>
                </div>
              )}
              
              {document.expires_at && (
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Vence: {formatExpiryDate(document.expires_at)}
                  </span>
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>Tamaño: {formatFileSize(document.file_size)}</div>
              <div>
                Subido: {formatDateOnly(document.created_at)}
              </div>
            </div>

            {/* Expiry Warning */}
            {(expiryStatus === "expired" || expiryStatus === "expiring") && (
              <div className={`flex items-center space-x-2 p-2 rounded text-xs ${
                expiryStatus === "expired" 
                  ? "bg-red-50 text-red-700 border border-red-200" 
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}>
                <AlertCircle className="h-3 w-3" />
                <span>
                  {expiryStatus === "expired" 
                    ? "Este documento ha vencido" 
                    : "Este documento vence pronto"
                  }
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownload}
                className="flex-1 text-xs h-8"
              >
                <Download className="h-3 w-3 mr-1" />
                Descargar
              </Button>
            </div>
          </CardContent>
        </div>

        {/* Right side - Document Preview */}
        <div className="w-full sm:w-48 lg:w-56 border-l-0 sm:border-l border-t sm:border-t-0 bg-muted/20">
          <DocumentPreview
            documentUrl={document.file_url}
            fileName={document.file_name}
            className="h-40 sm:h-full w-full rounded-none"
          />
        </div>
      </div>
    </Card>
  );
}