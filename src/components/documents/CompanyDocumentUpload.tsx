import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { formatDateInUserTimeZone, formatDateAuto, formatDateTimeAuto, formatPrettyDate } from '@/lib/dateFormatting';
import { CalendarIcon, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useFleetNotifications } from "@/components/notifications";
import { Upload, FileText, Copy, Replace } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

interface DocumentACIDResponse {
  success: boolean;
  message?: string;
  document?: any;
  document_id?: string;
}

interface PredefinedDocumentType {
  value: string;
  label: string;
  critical: boolean;
}

interface DocumentCategory {
  title: string;
  types: PredefinedDocumentType[];
}

interface CompanyDocumentUploadProps {
  predefinedTypes: Record<string, DocumentCategory>;
  selectedType?: string;
  onSuccess: () => void;
}

export function CompanyDocumentUpload({ 
  predefinedTypes, 
  selectedType, 
  onSuccess 
}: CompanyDocumentUploadProps) {
  const { t } = useTranslation('documents');
  const [documentType, setDocumentType] = useState(selectedType || "");
  const [customDocumentName, setCustomDocumentName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [issueDate, setIssueDate] = useState<Date | undefined>();
  const [expiryDate, setExpiryDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [existingDocument, setExistingDocument] = useState<any>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateAction, setDuplicateAction] = useState<'replace' | 'version' | 'cancel'>('replace');
  const [issueDateOpen, setIssueDateOpen] = useState(false);
  const [expiryDateOpen, setExpiryDateOpen] = useState(false);
  const { showSuccess, showError } = useFleetNotifications();

  // Get all predefined types for the select
  const allPredefinedTypes = Object.entries(predefinedTypes).flatMap(([categoryKey, category]) =>
    category.types.map(type => ({
      ...type,
      category: category.title,
      categoryKey
    }))
  );

  // Function to check for existing documents
  const checkExistingDocument = async (docType: string, companyId: string) => {
    const { data: existing } = await supabase
      .from("company_documents")
      .select("*")
      .eq("company_id", companyId)
      .eq("document_type", docType)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    return existing;
  };

  // Function to generate versioned filename
  const generateVersionedFilename = (originalName: string, docType: string) => {
    const timestamp = Date.now();
    const fileExt = originalName.split('.').pop();
    const baseName = originalName.replace(`.${fileExt}`, '');
    return `${baseName}_v${timestamp}.${fileExt}`;
  };
  
  const uploadMutation = useMutation({
    mutationFn: async (formData: {
      file: File;
      documentType: string;
      customDocumentName?: string;
      issueDate?: string;
      expiryDate?: string;
      notes?: string;
      action?: 'replace' | 'version';
    }) => {
      const { file, documentType, customDocumentName, issueDate, expiryDate, notes, action = 'version' } = formData;

      // Get user and company info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t('upload_modal.validation.auth_error'));

      const { data: userRoles } = await supabase
        .from("user_company_roles")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!userRoles) throw new Error(t('upload_modal.validation.company_info_error'));

      const companyId = userRoles.company_id;

      // Check for existing document if not replacing
      const existing = await checkExistingDocument(documentType, companyId);
      
      if (existing && action === 'replace') {
        // Archive the existing document instead of deleting
        await supabase
          .from("company_documents")
          .update({ is_active: false })
          .eq("id", existing.id);
      }

      // Generate filename
      const fileExt = file.name.split('.').pop();
      let fileName;
      
      if (action === 'version' && existing) {
        fileName = `${companyId}/${generateVersionedFilename(file.name, documentType)}`;
      } else {
        fileName = `${companyId}/${documentType}-${Date.now()}.${fileExt}`;
      }
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("company-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("company-documents")
        .getPublicUrl(fileName);

      // Save document record using ACID function
      const { data: rpcResult, error: insertError } = await supabase
        .rpc('create_or_update_document_with_validation', {
          document_data: {
            company_id: companyId,
            document_type: documentType,
            file_name: documentType === "custom" ? customDocumentName || file.name : file.name,
            file_url: publicUrl,
            file_size: file.size,
            content_type: file.type,
            issue_date: issueDate || null,
            expires_at: expiryDate || null,
            notes: notes || null,
            is_active: true
          }
        });

      if (insertError) throw insertError;
      
      const result = rpcResult as unknown as DocumentACIDResponse;
      if (!result?.success) {
        throw new Error(result?.message || t('upload_modal.error.upload_failed_description'));
      }

      return { fileName, publicUrl, action, wasReplaced: !!existing };
    },
    onSuccess: (data) => {
      const { action, wasReplaced } = data;
      
      if (wasReplaced && action === 'replace') {
        showSuccess(
          t('upload_modal.success.replaced'),
          t('upload_modal.success.replaced_description')
        );
      } else if (action === 'version') {
        showSuccess(
          t('upload_modal.success.new_version'),
          t('upload_modal.success.new_version_description')
        );
      } else {
        showSuccess(
          t('upload_modal.success.uploaded'),
          t('upload_modal.success.uploaded_description')
        );
      }
      
      onSuccess();
      // Reset form
      setFile(null);
      setDocumentType("");
      setCustomDocumentName("");
      setIssueDate(undefined);
      setExpiryDate(undefined);
      setNotes("");
      setShowDuplicateDialog(false);
      setExistingDocument(null);
    },
    onError: (error) => {
      console.error("Error uploading document:", error);
      showError(
        t('upload_modal.error.upload_failed'),
        t('upload_modal.error.upload_failed_description')
      );
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !documentType) {
      showError(
        t('upload_modal.validation.required_fields'),
        t('upload_modal.validation.select_type_and_file')
      );
      return;
    }

    if (documentType === "custom" && !customDocumentName.trim()) {
      showError(
        t('upload_modal.validation.name_required'),
        t('upload_modal.validation.custom_name_required')
      );
      return;
    }

    // Check for existing documents before uploading
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showError("Error", t('upload_modal.validation.auth_error'));
        return;
      }

      const { data: userRoles } = await supabase
        .from("user_company_roles")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!userRoles) {
        showError("Error", t('upload_modal.validation.company_info_error'));
        return;
      }

      const existing = await checkExistingDocument(documentType, userRoles.company_id);
      
      if (existing) {
        setExistingDocument(existing);
        setShowDuplicateDialog(true);
        return;
      }

      // No existing document, proceed with upload
      uploadMutation.mutate({
        file,
        documentType,
        customDocumentName,
        issueDate: issueDate ? formatDateInUserTimeZone(issueDate) : undefined,
        expiryDate: expiryDate ? formatDateInUserTimeZone(expiryDate) : undefined,
        notes
      });
    } catch (error) {
      console.error("Error checking existing documents:", error);
      showError("Error", t('upload_modal.validation.check_existing_error'));
    }
  };

  const handleDuplicateAction = () => {
    if (duplicateAction === 'cancel') {
      setShowDuplicateDialog(false);
      setExistingDocument(null);
      return;
    }

    uploadMutation.mutate({
      file: file!,
      documentType,
      customDocumentName,
      issueDate: issueDate ? formatDateInUserTimeZone(issueDate) : undefined,
      expiryDate: expiryDate ? formatDateInUserTimeZone(expiryDate) : undefined,
      notes,
      action: duplicateAction
    });
  };

  const selectedTypeInfo = allPredefinedTypes.find(t => t.value === documentType);

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-6">
      {/* Document Type Selection */}
      <div className="space-y-2">
        <Label htmlFor="document-type">{t('upload_modal.document_type_label')}</Label>
        <Select value={documentType} onValueChange={setDocumentType}>
          <SelectTrigger>
            <SelectValue placeholder={t('upload_modal.document_type_placeholder')} />
          </SelectTrigger>
          <SelectContent className="z-50">
            {Object.entries(predefinedTypes).map(([categoryKey, category]) => (
              <div key={categoryKey}>
                <div className="px-2 py-1 text-sm font-medium text-muted-foreground">
                  {category.title}
                </div>
                {category.types.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center space-x-2">
                      <span>{type.label}</span>
                      {type.critical && (
                        <Badge variant="secondary" className="text-xs">
                          {t('card.badges.critical')}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </div>
            ))}
            <div className="border-t mt-2 pt-2">
              <div className="px-2 py-1 text-sm font-medium text-muted-foreground">
                {t('upload_modal.custom_section')}
              </div>
              <SelectItem value="custom">
                <div className="flex items-center space-x-2">
                  <span>{t('upload_modal.custom_document')}</span>
                </div>
              </SelectItem>
            </div>
          </SelectContent>
        </Select>
        
        {selectedTypeInfo?.critical && (
          <p className="text-sm text-amber-600 flex items-center space-x-1">
            <AlertTriangle className="w-4 h-4" />
            <span>{t('upload_modal.critical_warning')}</span>
          </p>
        )}
      </div>

      {/* Custom Document Name */}
      {documentType === "custom" && (
        <div className="space-y-2">
          <Label htmlFor="custom-name">{t('upload_modal.custom_name_label')}</Label>
          <Input
            id="custom-name"
            value={customDocumentName}
            onChange={(e) => setCustomDocumentName(e.target.value)}
            placeholder={t('upload_modal.custom_name_placeholder')}
          />
        </div>
      )}

      {/* File Upload */}
      <div className="space-y-2">
        <Label htmlFor="file">{t('upload_modal.file_label')}</Label>
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
          <div className="text-center">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <div className="text-sm text-muted-foreground mb-2">
              {t('upload_modal.file_drop_text')}
            </div>
            <Input
              type="file"
              id="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className="hidden"
            />
            <Label htmlFor="file" className="cursor-pointer">
              <Button type="button" variant="outline" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {t('upload_modal.select_file')}
                </span>
              </Button>
            </Label>
          </div>
          {file && (
            <div className="mt-4 p-3 bg-muted rounded text-sm">
              <strong>{t('upload_modal.file_selected')}:</strong> {file.name}
              <br />
              <strong>{t('upload_modal.file_size')}:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t('upload_modal.supported_formats')}
        </p>
      </div>

      {/* Issue Date & Expiry Date */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Issue Date */}
        <div className="space-y-2">
          <Label>{t('upload_modal.issue_date_label')}</Label>
          <Popover open={issueDateOpen} onOpenChange={setIssueDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !issueDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {issueDate ? formatPrettyDate(issueDate) : <span>{t('upload_modal.issue_date_placeholder')}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[60]" align="start">
              <Calendar
                mode="single"
                selected={issueDate}
                onSelect={(date) => {
                  setIssueDate(date);
                  setIssueDateOpen(false);
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
                captionLayout="dropdown"
                fromYear={2000}
                toYear={2035}
              />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">
            {t('upload_modal.issue_date_help')}
          </p>
        </div>

        {/* Expiry Date */}
        <div className="space-y-2">
          <Label>{t('upload_modal.expiry_date_label')}</Label>
          <Popover open={expiryDateOpen} onOpenChange={setExpiryDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !expiryDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {expiryDate ? formatPrettyDate(expiryDate) : <span>{t('upload_modal.expiry_date_placeholder')}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[60]" align="start">
              <Calendar
                mode="single"
                selected={expiryDate}
                onSelect={(date) => {
                  setExpiryDate(date);
                  setExpiryDateOpen(false);
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
                captionLayout="dropdown"
                fromYear={2020}
                toYear={2035}
              />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">
            {t('upload_modal.expiry_date_help')}
          </p>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">{t('upload_modal.notes_label')}</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('upload_modal.notes_placeholder')}
          rows={3}
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-2">
        <Button 
          type="submit" 
          disabled={!file || !documentType || uploadMutation.isPending}
        >
          {uploadMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {t('upload_modal.uploading')}
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              {t('upload_modal.upload_button')}
            </>
          )}
        </Button>
      </div>
      </form>

      {/* Duplicate Document Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span>{t('upload_modal.duplicate_dialog.title')}</span>
            </DialogTitle>
            <DialogDescription>
              {t('upload_modal.duplicate_dialog.description', {
                type: allPredefinedTypes.find(t => t.value === documentType)?.label || documentType,
                date: existingDocument && formatDateAuto(existingDocument.created_at)
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-2 text-sm">
                <FileText className="w-4 h-4" />
                <span className="font-medium">{existingDocument?.file_name}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t('upload_modal.duplicate_dialog.uploaded_on', {
                  date: existingDocument && formatDateTimeAuto(existingDocument.created_at)
                })}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">{t('upload_modal.duplicate_dialog.what_to_do')}</Label>
              <RadioGroup value={duplicateAction} onValueChange={(value: 'replace' | 'version' | 'cancel') => setDuplicateAction(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="replace" id="replace" />
                  <Label htmlFor="replace" className="flex items-center space-x-2 cursor-pointer">
                    <Replace className="w-4 h-4 text-red-500" />
                    <div>
                      <div className="font-medium">{t('upload_modal.duplicate_dialog.replace_option')}</div>
                      <div className="text-xs text-muted-foreground">{t('upload_modal.duplicate_dialog.replace_description')}</div>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="version" id="version" />
                  <Label htmlFor="version" className="flex items-center space-x-2 cursor-pointer">
                    <Copy className="w-4 h-4 text-blue-500" />
                    <div>
                      <div className="font-medium">{t('upload_modal.duplicate_dialog.version_option')}</div>
                      <div className="text-xs text-muted-foreground">{t('upload_modal.duplicate_dialog.version_description')}</div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cancel" id="cancel" />
                  <Label htmlFor="cancel" className="flex items-center space-x-2 cursor-pointer">
                    <AlertTriangle className="w-4 h-4 text-gray-500" />
                    <div>
                      <div className="font-medium">{t('upload_modal.duplicate_dialog.cancel_option')}</div>
                      <div className="text-xs text-muted-foreground">{t('upload_modal.duplicate_dialog.cancel_description')}</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setShowDuplicateDialog(false)}
            >
              {t('upload_modal.duplicate_dialog.cancel_button')}
            </Button>
            <Button 
              onClick={handleDuplicateAction}
              disabled={uploadMutation.isPending}
              variant={duplicateAction === 'replace' ? 'destructive' : 'default'}
            >
              {uploadMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('upload_modal.duplicate_dialog.processing')}
                </>
              ) : (
                <>
                  {duplicateAction === 'replace' && t('upload_modal.duplicate_dialog.replace_button')}
                  {duplicateAction === 'version' && t('upload_modal.duplicate_dialog.version_button')}
                  {duplicateAction === 'cancel' && t('upload_modal.duplicate_dialog.cancel_button')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}