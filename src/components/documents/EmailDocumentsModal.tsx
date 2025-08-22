import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFleetNotifications } from "@/components/notifications";
import { Badge } from "@/components/ui/badge";
import { FileText, Mail, X, Send, AlertTriangle, FileWarning, Split } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface CompanyDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  expires_at?: string;
  created_at: string;
  file_size?: number;
  content_type?: string;
}

interface EmailDocumentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDocuments: CompanyDocument[];
  onSuccess: () => void;
}

export function EmailDocumentsModal({ 
  open, 
  onOpenChange, 
  selectedDocuments, 
  onSuccess 
}: EmailDocumentsModalProps) {
  const [recipients, setRecipients] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const { showSuccess, showError } = useFleetNotifications();

  // Validation rules (in bytes)
  const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB total
  const MAX_FILE_SIZE = 10 * 1024 * 1024;  // 10MB individual
  const MAX_DOCUMENTS = 10; // max documents per email
  const OPTIMAL_TOTAL_SIZE = 15 * 1024 * 1024; // 15MB recommended

  // Calculate sizes and validate
  const totalSize = selectedDocuments.reduce((sum, doc) => sum + (doc.file_size || 0), 0);
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  const largeFiles = selectedDocuments.filter(doc => (doc.file_size || 0) > MAX_FILE_SIZE);
  const exceedsTotal = totalSize > MAX_TOTAL_SIZE;
  const exceedsCount = selectedDocuments.length > MAX_DOCUMENTS;
  const nearLimit = totalSize > OPTIMAL_TOTAL_SIZE && totalSize <= MAX_TOTAL_SIZE;
  
  // Check if we can split into multiple emails
  const canSplit = selectedDocuments.length > 1 && exceedsTotal;

  const sendEmailMutation = useMutation({
    mutationFn: async (data: {
      recipients: string;
      subject: string;
      message: string;
      documentIds: string[];
    }) => {
      const { data: result, error } = await supabase.functions.invoke('send-documents-email', {
        body: data
      });

      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      const { failedDocuments = [], attachmentCount, totalRequested } = result;
      
      if (failedDocuments.length > 0) {
        showError(
          "Envío parcial completado",
          `Se enviaron ${attachmentCount} de ${totalRequested} documentos. Los siguientes no se pudieron enviar: ${failedDocuments.map((f: any) => `${f.name} (${f.reason})`).join(', ')}`
        );
      } else {
        showSuccess(
          "Documentos enviados",
          `Se enviaron ${attachmentCount} documentos por email exitosamente`
        );
      }
      
      onSuccess();
      onOpenChange(false);
      // Reset form
      setRecipients("");
      setSubject("");
      setMessage("");
    },
    onError: (error: any) => {
      console.error("Error sending documents:", error);
      showError(
        "Error al enviar documentos",
        error.message || "No se pudieron enviar los documentos por email"
      );
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous validation errors
    setValidationErrors({});
    const errors: {[key: string]: string} = {};
    
    // Validate form
    if (!recipients.trim()) {
      errors.recipients = "Por favor ingresa al menos un destinatario";
    } else {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const emailList = recipients.split(',').map(email => email.trim());
      const invalidEmails = emailList.filter(email => !emailRegex.test(email));
      
      if (invalidEmails.length > 0) {
        errors.recipients = `Emails inválidos: ${invalidEmails.join(', ')}`;
      }
    }

    if (!subject.trim()) {
      errors.subject = "Por favor ingresa un asunto para el email";
    }

    // Enhanced validations
    if (largeFiles.length > 0) {
      showError(
        "Archivos muy grandes", 
        `Los siguientes archivos exceden 10MB: ${largeFiles.map(f => f.file_name).join(', ')}`
      );
      return;
    }

    if (exceedsCount) {
      showError("Demasiados documentos", `Máximo ${MAX_DOCUMENTS} documentos por email. Tienes ${selectedDocuments.length}.`);
      return;
    }

    if (exceedsTotal) {
      showError(
        "Tamaño total excedido", 
        `El tamaño total (${totalSizeMB}MB) excede el límite de ${(MAX_TOTAL_SIZE / (1024 * 1024)).toFixed(0)}MB. ${canSplit ? 'Usa la opción "Dividir en emails".' : ''}`
      );
      return;
    }

    if (selectedDocuments.length === 0) {
      showError("Sin documentos", "No hay documentos seleccionados para enviar");
      return;
    }

    // If there are validation errors, show them and return
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    sendEmailMutation.mutate({
      recipients,
      subject,
      message,
      documentIds: selectedDocuments.map(doc => doc.id)
    });
  };

  const removeDocument = (documentId: string) => {
    // This would be handled by parent component
    // For now, we just show which documents are selected
  };

  // Function to split documents into valid groups
  const splitDocuments = () => {
    const groups: CompanyDocument[][] = [];
    let currentGroup: CompanyDocument[] = [];
    let currentSize = 0;

    for (const doc of selectedDocuments) {
      const docSize = doc.file_size || 0;
      
      // If this document alone exceeds limits, skip it
      if (docSize > MAX_FILE_SIZE) continue;
      
      // If adding this document would exceed limits, start new group
      if (currentSize + docSize > MAX_TOTAL_SIZE || currentGroup.length >= MAX_DOCUMENTS) {
        if (currentGroup.length > 0) {
          groups.push([...currentGroup]);
        }
        currentGroup = [doc];
        currentSize = docSize;
      } else {
        currentGroup.push(doc);
        currentSize += docSize;
      }
    }
    
    // Add the last group if it has documents
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  };

  const handleSplitAndSend = async () => {
    if (!recipients.trim() || !subject.trim()) {
      showError("Datos incompletos", "Por favor completa destinatarios y asunto antes de dividir");
      return;
    }

    const groups = splitDocuments();
    
    if (groups.length === 0) {
      showError("Sin documentos válidos", "No hay documentos que cumplan con los límites de tamaño");
      return;
    }

    try {
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const emailSubject = groups.length > 1 ? `${subject} (Parte ${i + 1} de ${groups.length})` : subject;
        
        await sendEmailMutation.mutateAsync({
          recipients,
          subject: emailSubject,
          message: groups.length > 1 
            ? `${message}\n\nNota: Este es el email ${i + 1} de ${groups.length} con los documentos divididos por tamaño.`
            : message,
          documentIds: group.map(doc => doc.id)
        });
      }
      
      showSuccess(
        "Documentos enviados", 
        `Se enviaron ${selectedDocuments.length} documentos en ${groups.length} email(s)`
      );
      onSuccess();
      onOpenChange(false);
      setRecipients("");
      setSubject("");
      setMessage("");
    } catch (error) {
      console.error("Error sending split emails:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl mx-1 sm:mx-0 bg-white max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-2 sm:space-y-3">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="truncate">Enviar Documentos</span>
          </DialogTitle>
          <DialogDescription className="text-sm">
            Envía los documentos seleccionados a uno o varios destinatarios
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selected Documents with Enhanced Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Documentos Seleccionados ({selectedDocuments.length}/{MAX_DOCUMENTS})
              </Label>
              {exceedsCount && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Demasiados
                </Badge>
              )}
            </div>
            
            <div className="max-h-28 sm:max-h-40 overflow-y-auto border rounded-md p-2 sm:p-3 space-y-1 sm:space-y-2">
              {selectedDocuments.map((doc) => {
                const fileSizeMB = (doc.file_size || 0) / (1024 * 1024);
                const isLarge = (doc.file_size || 0) > MAX_FILE_SIZE;
                
                return (
                   <div key={doc.id} className={`flex items-center gap-2 rounded p-2 sm:p-2 ${isLarge ? 'bg-red-50 border border-red-200' : 'bg-muted/50'}`}>
                     <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                       {isLarge ? (
                         <FileWarning className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 flex-shrink-0" />
                       ) : (
                         <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                       )}
                       <span className="text-xs sm:text-sm truncate flex-1">{doc.file_name}</span>
                     </div>
                     <div className="flex items-center gap-1 flex-shrink-0">
                       <Badge 
                         variant={isLarge ? "destructive" : "outline"} 
                         className="text-xs"
                       >
                         {fileSizeMB >= 1 ? `${fileSizeMB.toFixed(1)}MB` : `${(doc.file_size || 0 / 1024).toFixed(0)}KB`}
                       </Badge>
                       {isLarge && (
                         <Badge variant="destructive" className="text-xs">
                           &gt;10MB
                         </Badge>
                       )}
                     </div>
                   </div>
                );
              })}
            </div>
            
            {/* Enhanced Size Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground truncate">
                  Total: {totalSizeMB}MB / {(MAX_TOTAL_SIZE / (1024 * 1024)).toFixed(0)}MB
                </span>
                {exceedsTotal && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Excede límite
                  </Badge>
                )}
                {nearLimit && !exceedsTotal && (
                  <Badge variant="secondary" className="text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Cerca del límite
                  </Badge>
                )}
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    exceedsTotal ? 'bg-red-500' : 
                    nearLimit ? 'bg-yellow-500' : 
                    'bg-green-500'
                  }`}
                  style={{ 
                    width: `${Math.min((totalSize / MAX_TOTAL_SIZE) * 100, 100)}%` 
                  }}
                ></div>
              </div>
              
              {/* Validation Messages */}
               {largeFiles.length > 0 && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded flex items-center gap-1">
                  <FileWarning className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{largeFiles.length} archivo(s) muy grandes</span>
                </div>
              )}
              
              {canSplit && (
                <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded flex items-center gap-1">
                  <Split className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">Se pueden dividir en emails</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Recipients */}
          <div className="space-y-2">
            <Label htmlFor="recipients">Destinatarios *</Label>
            <Input
              id="recipients"
              value={recipients}
              onChange={(e) => {
                setRecipients(e.target.value);
                if (validationErrors.recipients) {
                  const newErrors = { ...validationErrors };
                  delete newErrors.recipients;
                  setValidationErrors(newErrors);
                }
              }}
              placeholder="email1@empresa.com, email2@empresa.com"
              disabled={sendEmailMutation.isPending}
              className={validationErrors.recipients ? "border-red-500" : ""}
            />
            {validationErrors.recipients && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded break-words">
                {validationErrors.recipients}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Separa emails con comas
            </p>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Asunto *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                if (validationErrors.subject) {
                  const newErrors = { ...validationErrors };
                  delete newErrors.subject;
                  setValidationErrors(newErrors);
                }
              }}
              placeholder="Documentos de la empresa"
              disabled={sendEmailMutation.isPending}
              className={validationErrors.subject ? "border-red-500" : ""}
            />
            {validationErrors.subject && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded break-words">
                {validationErrors.subject}
              </p>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Mensaje (Opcional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Estimado(a), adjunto encontrará los documentos solicitados..."
              rows={3}
              className="resize-none"
              disabled={sendEmailMutation.isPending}
            />
          </div>

          {/* Enhanced Actions */}
          <div className="flex flex-col gap-3">
            {canSplit && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSplitAndSend}
                disabled={sendEmailMutation.isPending || largeFiles.length > 0}
                className="w-full text-sm"
              >
                <Split className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Dividir en Emails</span>
                <span className="sm:hidden">Dividir</span>
              </Button>
            )}
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={sendEmailMutation.isPending}
                className="w-full text-sm order-2 sm:order-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  sendEmailMutation.isPending || 
                  exceedsTotal || 
                  exceedsCount ||
                  largeFiles.length > 0 ||
                  selectedDocuments.length === 0
                }
                className="w-full text-sm order-1 sm:order-2"
              >
                {sendEmailMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    <span className="hidden sm:inline">Enviando...</span>
                    <span className="sm:hidden">Enviando</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Enviar Documentos</span>
                    <span className="sm:hidden">Enviar</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}