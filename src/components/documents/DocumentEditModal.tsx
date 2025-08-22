import React, { useState } from "react";
import { format } from "date-fns";
import { formatPrettyDate } from '@/lib/dateFormatting';
import { CalendarIcon, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useDocumentManagementACID } from "@/hooks/useDocumentManagementACID";

interface Document {
  id: string;
  company_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  issue_date?: string;
  expires_at?: string;
  notes?: string;
  created_at: string;
  file_size?: number;
  content_type?: string;
  is_active: boolean;
}

interface DocumentEditModalProps {
  document: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentEditModal({ document, open, onOpenChange }: DocumentEditModalProps) {
  const [issueDate, setIssueDate] = useState<Date | undefined>(
    document?.issue_date ? new Date(document.issue_date) : undefined
  );
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(
    document?.expires_at ? new Date(document.expires_at) : undefined
  );
  const [notes, setNotes] = useState(document?.notes || "");
  const [issueDateOpen, setIssueDateOpen] = useState(false);
  const [expiryDateOpen, setExpiryDateOpen] = useState(false);

  const documentManagement = useDocumentManagementACID();

  // Reset form when document changes
  React.useEffect(() => {
    if (document) {
      setIssueDate(document.issue_date ? new Date(document.issue_date) : undefined);
      setExpiryDate(document.expires_at ? new Date(document.expires_at) : undefined);
      setNotes(document.notes || "");
    }
  }, [document]);

  const handleSave = async () => {
    if (!document) return;

    try {
      await documentManagement.mutateAsync({
        documentData: {
          company_id: document.company_id,
          document_type: document.document_type,
          file_name: document.file_name,
          file_url: document.file_url,
          content_type: document.content_type,
          file_size: document.file_size,
          issue_date: issueDate ? format(issueDate, "yyyy-MM-dd") : undefined,
          expires_at: expiryDate ? format(expiryDate, "yyyy-MM-dd") : undefined,
          notes: notes.trim() || undefined,
          is_active: document.is_active,
        },
        documentId: document.id,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating document:', error);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    setIssueDate(document?.issue_date ? new Date(document.issue_date) : undefined);
    setExpiryDate(document?.expires_at ? new Date(document.expires_at) : undefined);
    setNotes(document?.notes || "");
    onOpenChange(false);
  };

  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar documento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Document info */}
          <div className="bg-muted/30 p-3 rounded-lg">
            <p className="font-medium text-sm">{document.file_name}</p>
            <p className="text-xs text-muted-foreground">{document.document_type}</p>
          </div>

          {/* Issue Date & Expiry Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Issue Date */}
            <div className="space-y-2">
              <Label>Fecha de Emisión</Label>
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
                    {issueDate ? formatPrettyDate(issueDate) : <span>Seleccionar fecha</span>}
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
                Fecha de emisión del documento
              </p>
            </div>

            {/* Expiry Date */}
            <div className="space-y-2">
              <Label>Fecha de Vencimiento</Label>
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
                    {expiryDate ? formatPrettyDate(expiryDate) : <span>Seleccionar fecha</span>}
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
                Te notificaremos antes de que expire
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agrega cualquier información adicional sobre este documento..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={documentManagement.isPending}
          >
            {documentManagement.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}