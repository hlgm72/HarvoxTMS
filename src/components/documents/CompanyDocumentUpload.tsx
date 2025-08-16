import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { formatDateInUserTimeZone, formatDateAuto, formatDateTimeAuto } from '@/lib/dateFormatting';
import { CalendarIcon } from "lucide-react";
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
import { Upload, FileText, Calendar as CalendarIcon2, AlertTriangle, Copy, Replace } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  const [documentType, setDocumentType] = useState(selectedType || "");
  const [customDocumentName, setCustomDocumentName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [existingDocument, setExistingDocument] = useState<any>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateAction, setDuplicateAction] = useState<'replace' | 'version' | 'cancel'>('replace');
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
      expiryDate?: string;
      notes?: string;
      action?: 'replace' | 'version';
    }) => {
      const { file, documentType, customDocumentName, expiryDate, notes, action = 'version' } = formData;

      // Get user and company info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data: userRoles } = await supabase
        .from("user_company_roles")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!userRoles) throw new Error("No se pudo obtener la información de la compañía");

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

      // Save document record
      const { error: insertError } = await supabase
        .from("company_documents")
        .insert({
          company_id: companyId,
          document_type: documentType,
          file_name: documentType === "custom" ? customDocumentName || file.name : file.name,
          file_url: publicUrl,
          file_size: file.size,
          content_type: file.type,
          expires_at: expiryDate || null,
          uploaded_by: user.id,
          is_active: true,
          ...(notes && { notes })
        });

      if (insertError) throw insertError;

      return { fileName, publicUrl, action, wasReplaced: !!existing };
    },
    onSuccess: (data) => {
      const { action, wasReplaced } = data;
      
      if (wasReplaced && action === 'replace') {
        showSuccess(
          "Documento reemplazado exitosamente",
          "El documento anterior se archivó y el nuevo se guardó correctamente"
        );
      } else if (action === 'version') {
        showSuccess(
          "Nueva versión guardada",
          "Se creó una nueva versión del documento manteniendo la anterior"
        );
      } else {
        showSuccess(
          "Documento subido exitosamente",
          "El documento se ha guardado correctamente"
        );
      }
      
      onSuccess();
      // Reset form
      setFile(null);
      setDocumentType("");
      setCustomDocumentName("");
      setExpiryDate(undefined);
      setNotes("");
      setShowDuplicateDialog(false);
      setExistingDocument(null);
    },
    onError: (error) => {
      console.error("Error uploading document:", error);
      showError(
        "Error al subir documento",
        "No se pudo subir el documento. Intenta nuevamente."
      );
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !documentType) {
      showError(
        "Campos requeridos",
        "Por favor selecciona un tipo de documento y un archivo"
      );
      return;
    }

    if (documentType === "custom" && !customDocumentName.trim()) {
      showError(
        "Nombre requerido",
        "Por favor ingresa un nombre para el documento personalizado"
      );
      return;
    }

    // Check for existing documents before uploading
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showError("Error", "Usuario no autenticado");
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
        showError("Error", "No se pudo obtener la información de la compañía");
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
        expiryDate: expiryDate ? formatDateInUserTimeZone(expiryDate) : undefined,
        notes
      });
    } catch (error) {
      console.error("Error checking existing documents:", error);
      showError("Error", "Error al verificar documentos existentes");
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
      expiryDate: expiryDate ? formatDateInUserTimeZone(expiryDate) : undefined,
      notes,
      action: duplicateAction
    });
  };

  const selectedTypeInfo = allPredefinedTypes.find(t => t.value === documentType);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Document Type Selection */}
      <div className="space-y-2">
        <Label htmlFor="document-type">Tipo de Documento *</Label>
        <Select value={documentType} onValueChange={setDocumentType}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona el tipo de documento" />
          </SelectTrigger>
          <SelectContent>
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
                          Crítico
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </div>
            ))}
            <div className="border-t mt-2 pt-2">
              <div className="px-2 py-1 text-sm font-medium text-muted-foreground">
                Personalizado
              </div>
              <SelectItem value="custom">
                <div className="flex items-center space-x-2">
                  <span>Documento Personalizado</span>
                </div>
              </SelectItem>
            </div>
          </SelectContent>
        </Select>
        
        {selectedTypeInfo?.critical && (
          <p className="text-sm text-amber-600 flex items-center space-x-1">
            <Calendar className="w-4 h-4" />
            <span>Este es un documento crítico para operaciones</span>
          </p>
        )}
      </div>

      {/* Custom Document Name */}
      {documentType === "custom" && (
        <div className="space-y-2">
          <Label htmlFor="custom-name">Nombre del Documento *</Label>
          <Input
            id="custom-name"
            value={customDocumentName}
            onChange={(e) => setCustomDocumentName(e.target.value)}
            placeholder="Ej: Certificación Especial, Acuerdo Personalizado"
          />
        </div>
      )}

      {/* File Upload */}
      <div className="space-y-2">
        <Label htmlFor="file">Archivo *</Label>
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
          <div className="text-center">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <div className="text-sm text-muted-foreground mb-2">
              Arrastra y suelta tu archivo aquí, o
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
                  Seleccionar Archivo
                </span>
              </Button>
            </Label>
          </div>
          {file && (
            <div className="mt-4 p-3 bg-muted rounded text-sm">
              <strong>Archivo seleccionado:</strong> {file.name}
              <br />
              <strong>Tamaño:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Formatos soportados: PDF, DOC, DOCX, JPG, PNG (máx. 10MB)
        </p>
      </div>

      {/* Expiry Date */}
      <div className="space-y-2">
        <Label>Fecha de Vencimiento (Opcional)</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !expiryDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {expiryDate ? format(expiryDate, "PPP") : <span>Seleccionar fecha</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={expiryDate}
              onSelect={setExpiryDate}
              initialFocus
              className="pointer-events-auto"
              captionLayout="dropdown"
              fromYear={2020}
              toYear={2035}
            />
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground">
          Si el documento tiene fecha de vencimiento, te notificaremos antes de que expire
        </p>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notas (Opcional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Agrega cualquier información adicional sobre este documento..."
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
              Subiendo...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Subir Documento
            </>
          )}
        </Button>
      </div>

      {/* Duplicate Document Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span>Documento Existente Detectado</span>
            </DialogTitle>
            <DialogDescription>
              Ya tienes un documento de tipo "{allPredefinedTypes.find(t => t.value === documentType)?.label || documentType}" 
              subido {existingDocument && formatDateAuto(existingDocument.created_at)}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-2 text-sm">
                <FileText className="w-4 h-4" />
                <span className="font-medium">{existingDocument?.file_name}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Subido el {existingDocument && formatDateTimeAuto(existingDocument.created_at)}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">¿Qué deseas hacer?</Label>
              <RadioGroup value={duplicateAction} onValueChange={(value: 'replace' | 'version' | 'cancel') => setDuplicateAction(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="replace" id="replace" />
                  <Label htmlFor="replace" className="flex items-center space-x-2 cursor-pointer">
                    <Replace className="w-4 h-4 text-red-500" />
                    <div>
                      <div className="font-medium">Reemplazar documento existente</div>
                      <div className="text-xs text-muted-foreground">El documento anterior se archivará</div>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="version" id="version" />
                  <Label htmlFor="version" className="flex items-center space-x-2 cursor-pointer">
                    <Copy className="w-4 h-4 text-blue-500" />
                    <div>
                      <div className="font-medium">Mantener ambos (agregar versión)</div>
                      <div className="text-xs text-muted-foreground">Se creará una nueva versión del documento</div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cancel" id="cancel" />
                  <Label htmlFor="cancel" className="flex items-center space-x-2 cursor-pointer">
                    <AlertTriangle className="w-4 h-4 text-gray-500" />
                    <div>
                      <div className="font-medium">Cancelar subida</div>
                      <div className="text-xs text-muted-foreground">No subir el nuevo documento</div>
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
              Cancelar
            </Button>
            <Button 
              onClick={handleDuplicateAction}
              disabled={uploadMutation.isPending}
              variant={duplicateAction === 'replace' ? 'destructive' : 'default'}
            >
              {uploadMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Procesando...
                </>
              ) : (
                <>
                  {duplicateAction === 'replace' && 'Reemplazar'}
                  {duplicateAction === 'version' && 'Crear Versión'}
                  {duplicateAction === 'cancel' && 'Cancelar'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}