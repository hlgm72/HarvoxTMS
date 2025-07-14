import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertCircle, Calendar, Download, FileText, MoreVertical, Archive, ArchiveRestore } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
  getExpiryStatus: (expiresAt?: string) => string;
  isArchived?: boolean;
}

export function DocumentCard({ 
  document, 
  predefinedTypes, 
  onArchive, 
  onRestore,
  getExpiryStatus,
  isArchived = false
}: DocumentCardProps) {
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

  return (
    <Card className="hover:shadow-md transition-shadow">
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
        {/* Expiry Date */}
        {document.expires_at && (
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              Vence: {format(new Date(document.expires_at), "d 'de' MMMM, yyyy", { locale: es })}
            </span>
          </div>
        )}

        {/* File Info */}
        <div className="space-y-1 text-xs text-muted-foreground">
          <div>Tamaño: {formatFileSize(document.file_size)}</div>
          <div>
            Subido: {format(new Date(document.created_at), "d MMM yyyy", { locale: es })}
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
    </Card>
  );
}