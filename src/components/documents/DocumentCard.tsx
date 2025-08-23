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
import { AlertCircle, Calendar, Download, FileText, MoreVertical, Archive, ArchiveRestore, Trash2, Pencil, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useFleetNotifications } from "@/components/notifications";
import { formatExpiryDate, formatDateOnly } from '@/lib/dateFormatting';
import DocumentPreview from "@/components/loads/DocumentPreview";
import { EmailDocumentsModal } from "@/components/documents/EmailDocumentsModal";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation('documents');
  const { isCompanyOwner } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  
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
        return <Badge variant="destructive">{t('card.badges.expired')}</Badge>;
      case "expiring":
        return <Badge variant="outline" className="border-amber-500 text-amber-600">{t('card.badges.expiring')}</Badge>;
      case "valid":
        return <Badge variant="outline" className="border-green-500 text-green-600">{t('card.badges.valid')}</Badge>;
      default:
        return null;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return t('card.unknown_size');
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

  const handleDownload = async () => {
    try {
      // Handle blob URLs (temporary documents)
      if (document.file_url.startsWith('blob:')) {
        const response = await fetch(document.file_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        const link = window.document.createElement('a');
        link.href = url;
        link.download = document.file_name;
        link.style.display = 'none';
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        
        // Clean up the object URL
        window.URL.revokeObjectURL(url);
        return;
      }

      // Handle Supabase storage URLs - generate signed URL
      let storageFilePath = document.file_url;
      let bucketName = 'company-documents'; // default bucket
      
      if (document.file_url.includes('/load-documents/')) {
        storageFilePath = document.file_url.split('/load-documents/')[1];
        bucketName = 'load-documents';
      } else if (document.file_url.includes('/company-documents/')) {
        storageFilePath = document.file_url.split('/company-documents/')[1];
        bucketName = 'company-documents';
      }

      // Generate signed URL for download
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(storageFilePath, 3600);

      if (urlError) {
        console.error('Error generating download URL:', urlError);
        showError(t('card.download_error'));
        return;
      }

      if (signedUrlData?.signedUrl) {
        // Fetch the file and create a blob for proper download
        const response = await fetch(signedUrlData.signedUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        const link = window.document.createElement('a');
        link.href = url;
        link.download = document.file_name;
        link.style.display = 'none';
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        
        // Clean up the object URL
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      showError(t('card.download_error'));
    }
  };

  const handleOpenInNewTab = async () => {
    try {
      // Handle blob URLs (temporary documents)
      if (document.file_url.startsWith('blob:')) {
        window.open(document.file_url, '_blank');
        return;
      }

      // Handle Supabase storage URLs - generate signed URL
      let storageFilePath = document.file_url;
      let bucketName = 'company-documents'; // default bucket
      
      if (document.file_url.includes('/load-documents/')) {
        storageFilePath = document.file_url.split('/load-documents/')[1];
        bucketName = 'load-documents';
      } else if (document.file_url.includes('/company-documents/')) {
        storageFilePath = document.file_url.split('/company-documents/')[1];
        bucketName = 'company-documents';
      }

      // Generate signed URL for access
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(storageFilePath, 3600);

      if (urlError) {
        console.error('Error generating document URL:', urlError);
        showError(t('card.open_error'));
        return;
      }

      if (signedUrlData?.signedUrl) {
        window.open(signedUrlData.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error opening document:', error);
      showError(t('card.open_error'));
    }
  };

  const handlePermanentDelete = async () => {
    try {
      const { data, error } = await supabase.rpc('delete_company_document_permanently', {
        document_id: document.id
      });

      if (error) {
        console.error('Error al eliminar documento:', error);
        showError(
          t('notifications.error_title'),
          t('card.delete_error')
        );
        return;
      }

      if (data && typeof data === 'object' && 'success' in data && !data.success) {
        showError(
          t('notifications.error_title'),
          typeof data === 'object' && 'message' in data ? String(data.message) : t('card.delete_error')
        );
        return;
      }

      showSuccess(
        t('card.delete_success')
      );
      
      // Refresh the parent component
      window.location.reload();
    } catch (error) {
      console.error('Error:', error);
      showError(
        t('notifications.error_title'),
        t('card.delete_error')
      );
    }
  };

  return (
    <Card className={`hover:shadow-md transition-shadow ${
      expiryStatus === "expired" || expiryStatus === "expiring" 
        ? "border-red-500 bg-red-100/50" 
        : ""
    }`}>
      <div className="flex gap-4 p-4">
        {/* Left column - Document Info */}
        <div className="flex-1 space-y-3">
          {/* Document Title and Icon with Menu */}
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <div className="text-2xl">{getFileIcon()}</div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-medium line-clamp-2">
                  {typeInfo.label}
                </CardTitle>
              </div>
            </div>
            
            {/* Menu dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-50">
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  {t('card.menu.download')}
                </DropdownMenuItem>
                
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(document)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    {t('card.menu.edit')}
                  </DropdownMenuItem>
                )}
                {isArchived ? (
                  onRestore && (
                    <DropdownMenuItem 
                      onClick={() => onRestore(document.id)}
                      className="text-green-600"
                    >
                      <ArchiveRestore className="h-4 w-4 mr-2" />
                      {t('card.menu.restore')}
                    </DropdownMenuItem>
                  )
                ) : (
                  onArchive && (
                    <DropdownMenuItem 
                      onClick={() => onArchive(document.id)}
                      className="text-amber-600"
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      {t('card.menu.archive')}
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
                          {t('card.menu.delete_permanently')}
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('card.delete_dialog.title')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('card.delete_dialog.description')}
                            <br /><br />
                            <strong>{t('card.delete_dialog.file_label')}:</strong> {document.file_name}
                            <br />
                            <strong>{t('card.delete_dialog.type_label')}:</strong> {document.document_type}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('card.delete_dialog.cancel')}</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handlePermanentDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {t('card.delete_dialog.confirm')}
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
                {t('card.badges.critical')}
              </Badge>
            )}
            {getExpiryBadge()}
          </div>

          {/* File Name */}
          <CardDescription className="text-xs line-clamp-1 text-muted-foreground">
            {document.file_name}
          </CardDescription>

          {/* Document Dates */}
          <div className="space-y-1">
            {document.issue_date && (
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {t('card.dates.issued')}: {formatDateOnly(document.issue_date)}
                </span>
              </div>
            )}
            
            {document.expires_at && (
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {t('card.dates.expires')}: {formatExpiryDate(document.expires_at)}
                </span>
              </div>
            )}
          </div>

          {/* File Info */}
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>{t('card.dates.size')}: {formatFileSize(document.file_size)}</div>
            <div>
              {t('card.dates.uploaded')}: {formatDateOnly(document.created_at)}
            </div>
          </div>
        </div>

        {/* Right column - Preview only */}
        <div className="w-36 sm:w-48">
          {/* Document Preview */}
          <div 
            className="w-full h-36 sm:h-48 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleOpenInNewTab}
            title={t('card.click_to_open')}
          >
            <DocumentPreview
              documentUrl={document.file_url}
              fileName={document.file_name}
              className="w-full h-full rounded border"
            />
          </div>
        </div>
      </div>

      {/* Bottom row - Action buttons aligned horizontally */}
      <div className="flex gap-2 px-4 pb-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleDownload}
          className="flex-1 text-xs h-8"
        >
          <Download className="h-3 w-3 mr-1" />
          {t('card.buttons.download')}
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setEmailModalOpen(true)}
          className="flex-1 text-xs h-8"
        >
          <Mail className="h-3 w-3 mr-1" />
          {t('card.buttons.email')}
        </Button>
      </div>

      {/* Email Modal */}
      <EmailDocumentsModal
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        selectedDocuments={[document]}
        onSuccess={() => {
          setEmailModalOpen(false);
          showSuccess(t('card.email_success'));
        }}
      />

    </Card>
  );
}