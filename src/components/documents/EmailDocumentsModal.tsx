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
import { FileText, Mail, X, Send, AlertTriangle } from "lucide-react";
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
  const { showSuccess, showError } = useFleetNotifications();

  // Calculate total file size
  const totalSize = selectedDocuments.reduce((sum, doc) => sum + (doc.file_size || 0), 0);
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  const maxSizeMB = 25; // Resend limit
  const exceedsLimit = parseFloat(totalSizeMB) > maxSizeMB;

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
    onSuccess: () => {
      showSuccess(
        "Documentos enviados",
        `Se enviaron ${selectedDocuments.length} documentos por email exitosamente`
      );
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
    
    // Validate form
    if (!recipients.trim()) {
      showError("Email requerido", "Por favor ingresa al menos un destinatario");
      return;
    }

    if (!subject.trim()) {
      showError("Asunto requerido", "Por favor ingresa un asunto para el email");
      return;
    }

    if (exceedsLimit) {
      showError("Archivos muy grandes", `El tamaño total (${totalSizeMB}MB) excede el límite de ${maxSizeMB}MB`);
      return;
    }

    if (selectedDocuments.length === 0) {
      showError("Sin documentos", "No hay documentos seleccionados para enviar");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailList = recipients.split(',').map(email => email.trim());
    const invalidEmails = emailList.filter(email => !emailRegex.test(email));
    
    if (invalidEmails.length > 0) {
      showError("Emails inválidos", `Los siguientes emails no son válidos: ${invalidEmails.join(', ')}`);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Enviar Documentos por Email
          </DialogTitle>
          <DialogDescription>
            Envía los documentos seleccionados a uno o varios destinatarios
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selected Documents */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Documentos Seleccionados ({selectedDocuments.length})
            </Label>
            <div className="max-h-40 overflow-y-auto border rounded-md p-3 space-y-2">
              {selectedDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between bg-muted/50 rounded p-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{doc.file_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)}KB` : 'N/A'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Size warning */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Tamaño total: {totalSizeMB}MB de {maxSizeMB}MB máximo
              </span>
              {exceedsLimit && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Excede el límite</span>
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
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="email1@empresa.com, email2@empresa.com"
              disabled={sendEmailMutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Separa múltiples emails con comas
            </p>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Asunto *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Documentos de la empresa"
              disabled={sendEmailMutation.isPending}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Mensaje (Opcional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Estimado(a), adjunto encontrará los documentos solicitados..."
              rows={4}
              disabled={sendEmailMutation.isPending}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sendEmailMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={sendEmailMutation.isPending || exceedsLimit || selectedDocuments.length === 0}
            >
              {sendEmailMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Documentos
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}