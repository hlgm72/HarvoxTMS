import React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClientContact } from "@/hooks/useCompanyClients";

interface ContactComboboxProps {
  contacts: ClientContact[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const ContactCombobox: React.FC<ContactComboboxProps> = ({
  contacts,
  value,
  onValueChange,
  placeholder = "Seleccionar contacto...",
  disabled = false,
  className
}) => {
  const [open, setOpen] = React.useState(false);

  const selectedContact = contacts.find(contact => contact.id === value);

  const handleSelect = (contactId: string) => {
    const newValue = contactId === value ? "" : contactId;
    onValueChange(newValue);
    setOpen(false);
  };

  if (!contacts || contacts.length === 0) {
    return (
      <Button
        variant="outline"
        disabled
        className={cn("justify-between", className)}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Users className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Sin contactos disponibles</span>
        </div>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {selectedContact ? selectedContact.name : placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Buscar contacto..." />
          <CommandList>
            <CommandEmpty>No se encontraron contactos.</CommandEmpty>
            <CommandGroup>
              {contacts.map((contact) => (
                <CommandItem
                  key={contact.id}
                  value={contact.name}
                  onSelect={() => handleSelect(contact.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === contact.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{contact.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {contact.email && <span>{contact.email}</span>}
                        {contact.phone_office && (
                          <span className="ml-2">📞 {contact.phone_office}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};