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
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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
  ArrowDown
} from "lucide-react";
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

type SortField = 'file_name' | 'document_type' | 'created_at' | 'expires_at' | 'file_size';
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

      if (sortField === 'created_at' || sortField === 'expires_at') {
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
                    <TableCell colSpan={8} className="font-medium">
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
                        {document.expires_at ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">
                              {format(new Date(document.expires_at), "d MMM yyyy", { locale: es })}
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
                          {format(new Date(document.created_at), "d MMM yyyy", { locale: es })}
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