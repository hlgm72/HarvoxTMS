import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Calendar } from "lucide-react";
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
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // Get all predefined types for the select
  const allPredefinedTypes = Object.entries(predefinedTypes).flatMap(([categoryKey, category]) =>
    category.types.map(type => ({
      ...type,
      category: category.title,
      categoryKey
    }))
  );

  const uploadMutation = useMutation({
    mutationFn: async (formData: {
      file: File;
      documentType: string;
      customDocumentName?: string;
      expiryDate?: string;
      notes?: string;
    }) => {
      const { file, documentType, customDocumentName, expiryDate, notes } = formData;

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

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${companyId}/${documentType}-${Date.now()}.${fileExt}`;
      
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
          ...(notes && { notes })
        });

      if (insertError) throw insertError;

      return { fileName, publicUrl };
    },
    onSuccess: () => {
      toast({
        title: "Documento subido exitosamente",
        description: "El documento se ha guardado correctamente",
      });
      onSuccess();
      // Reset form
      setFile(null);
      setDocumentType("");
      setCustomDocumentName("");
      setExpiryDate("");
      setNotes("");
    },
    onError: (error) => {
      console.error("Error uploading document:", error);
      toast({
        title: "Error al subir documento",
        description: "No se pudo subir el documento. Intenta nuevamente.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !documentType) {
      toast({
        title: "Campos requeridos",
        description: "Por favor selecciona un tipo de documento y un archivo",
        variant: "destructive",
      });
      return;
    }

    if (documentType === "custom" && !customDocumentName.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Por favor ingresa un nombre para el documento personalizado",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate({
      file,
      documentType,
      customDocumentName,
      expiryDate,
      notes
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
        <Label htmlFor="expiry-date">Fecha de Vencimiento (Opcional)</Label>
        <Input
          type="date"
          id="expiry-date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
        />
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
    </form>
  );
}