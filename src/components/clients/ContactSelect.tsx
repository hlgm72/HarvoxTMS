import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientContact } from '@/hooks/useCompanyClients';

interface ContactSelectProps {
  contacts: ClientContact[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const ContactSelect = ({
  contacts,
  value,
  onValueChange,
  placeholder = "Seleccionar contacto...",
  disabled = false
}: ContactSelectProps) => {
  if (!contacts || contacts.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Sin contactos disponibles" />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select 
      value={value} 
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {contacts.map((contact) => (
          <SelectItem key={contact.id} value={contact.id}>
            <div className="flex flex-col">
              <span className="font-medium">{contact.name}</span>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {contact.email && <span>{contact.email}</span>}
                {contact.phone_office && <span>📞 {contact.phone_office}</span>}
                {contact.extension && <span>Ext. {contact.extension}</span>}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};