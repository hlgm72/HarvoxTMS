import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertCircle, 
  Calendar, 
  Download, 
  MoreVertical, 
  Archive,
  ArchiveRestore,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useFleetNotifications } from "@/components/notifications";
import { formatExpiryDate, formatDateOnly } from '@/lib/dateFormatting';

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
  is_active: boolean;
  archived_at?: string;
  archived_by?: string;
}

interface DocumentTableProps {
  documents: CompanyDocument[];
  predefinedTypes: Record<string, DocumentCategory>;
  selectedDocuments: Set<string>;
  onSelectDocument: (documentId: string, selected: boolean) => void;
  onSelectAll: () => void;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
  getExpiryStatus: (expiresAt?: string) => string;
  isArchived?: boolean;
}

type SortField = 'file_name' | 'document_type' | 'created_at' | 'issue_date' | 'expires_at' | 'file_size';
type SortDirection = 'asc' | 'desc';

export function DocumentTable({
  documents,
  predefinedTypes,
  selectedDocuments,
  onSelectDocument,
  onSelectAll,
  onArchive,
  onRestore,
  getExpiryStatus,
  isArchived = false
}: DocumentTableProps) {
  const { isCompanyOwner } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [groupBy, setGroupBy] = useState<'none' | 'type'>('none');

  // Helper functions
  const getDocumentTypeInfo = (documentType: string) => {
    for (const category of Object.values(predefinedTypes)) {
      const type = category.types.find(t => t.value === documentType);
      if (type) return { ...type, categoryTitle: category.title };
    }
    return { 
      value: documentType, 
      label: documentType, 
      critical: false, 
      categoryTitle: 'Otros' 
    };
  };

  const getExpiryBadge = (expiryStatus: string) => {
    switch (expiryStatus) {
      case "expired":
        return <Badge variant="destructive">Vencido</Badge>;
      case "expiring":
        return <Badge variant="outline" className="border-amber-500 text-amber-600">Por Vencer</Badge>;
      case "valid":
        return <Badge variant="outline" className="border-green-500 text-green-600">Vigente</Badge>;
      default:
        return <Badge variant="outline">Sin fecha</Badge>;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A";
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  const handleDownload = (document: CompanyDocument) => {
    const link = window.document.createElement('a');
    link.href = document.file_url;
    link.download = document.file_name;
    link.target = '_blank';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handlePermanentDelete = async (documentId: string) => {
    try {
      const { data, error } = await supabase.rpc('delete_company_document_permanently', {
        document_id: documentId
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

  // Sorting logic
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  // Sort documents
  const sortedDocuments = useMemo(() => {
    const sorted = [...documents].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'document_type') {
        aValue = getDocumentTypeInfo(a.document_type).label;
        bValue = getDocumentTypeInfo(b.document_type).label;
      }

      if (sortField === 'created_at' || sortField === 'expires_at' || sortField === 'issue_date') {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      }

      if (sortField === 'file_size') {
        aValue = aValue || 0;
        bValue = bValue || 0;
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue || '').toLowerCase();
      }

      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [documents, sortField, sortDirection, predefinedTypes]);

  // Group documents
  const groupedDocuments = useMemo(() => {
    if (groupBy === 'none') {
      return [{ title: '', documents: sortedDocuments }];
    }

    const groups: Record<string, CompanyDocument[]> = {};
    
    sortedDocuments.forEach(doc => {
      const typeInfo = getDocumentTypeInfo(doc.document_type);
      const groupKey = typeInfo.categoryTitle;
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(doc);
    });

    return Object.entries(groups).map(([title, documents]) => ({
      title,
      documents
    }));
  }, [sortedDocuments, groupBy, predefinedTypes]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Agrupar por:</span>
            <Select value={groupBy} onValueChange={(value) => setGroupBy(value as 'none' | 'type')}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin agrupar</SelectItem>
                <SelectItem value="type">Tipo de documento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedDocuments.size === documents.length && documents.length > 0}
            onCheckedChange={onSelectAll}
          />
          <span className="text-sm text-muted-foreground">
            {selectedDocuments.size} de {documents.length} seleccionados
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedDocuments.size === documents.length && documents.length > 0}
                  onCheckedChange={onSelectAll}
                />
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('file_name')}
              >
                <div className="flex items-center gap-2">
                  Nombre del archivo
                  {getSortIcon('file_name')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('document_type')}
              >
                <div className="flex items-center gap-2">
                  Tipo
                  {getSortIcon('document_type')}
                </div>
              </TableHead>
              <TableHead>Estado</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('issue_date')}
              >
                <div className="flex items-center gap-2">
                  Fecha de emisión
                  {getSortIcon('issue_date')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('expires_at')}
              >
                <div className="flex items-center gap-2">
                  Fecha de vencimiento
                  {getSortIcon('expires_at')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('file_size')}
              >
                <div className="flex items-center gap-2">
                  Tamaño
                  {getSortIcon('file_size')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center gap-2">
                  Fecha de subida
                  {getSortIcon('created_at')}
                </div>
              </TableHead>
              <TableHead className="w-12">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedDocuments.map((group, groupIndex) => (
              <React.Fragment key={groupIndex}>
                {/* Group header */}
                {groupBy !== 'none' && group.title && (
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={9} className="font-medium">
                      {group.title} ({group.documents.length})
                    </TableCell>
                  </TableRow>
                )}
                
                {/* Documents */}
                {group.documents.map((document) => {
                  const typeInfo = getDocumentTypeInfo(document.document_type);
                  const expiryStatus = getExpiryStatus(document.expires_at);
                  
                  return (
                    <TableRow key={document.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Checkbox
                          checked={selectedDocuments.has(document.id)}
                          onCheckedChange={(checked) => 
                            onSelectDocument(document.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {document.content_type?.includes('pdf') ? '📄' : 
                             document.content_type?.includes('image') ? '🖼️' : 
                             document.content_type?.includes('word') ? '📝' : '📄'}
                          </span>
                          <div>
                            <div className="font-medium">{document.file_name}</div>
                            {typeInfo.critical && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                Crítico
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{typeInfo.label}</span>
                      </TableCell>
                      <TableCell>
                        {getExpiryBadge(expiryStatus)}
                      </TableCell>
                      <TableCell>
                        {document.issue_date ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">
                              {formatDateOnly(document.issue_date)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Sin fecha</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {document.expires_at ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">
                              {formatExpiryDate(document.expires_at)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Sin fecha</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{formatFileSize(document.file_size)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {formatDateOnly(document.created_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                           <DropdownMenuContent align="end">
                             <DropdownMenuItem onClick={() => handleDownload(document)}>
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
                                         onClick={() => handlePermanentDelete(document.id)}
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
                      </TableCell>
                    </TableRow>
                  );
                })}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
        
        {documents.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No hay documentos para mostrar
          </div>
        )}
      </div>
    </div>
  );
}