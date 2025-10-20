import React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Users, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClientContact, useClientContacts } from "@/hooks/useClients";
import { useTranslation } from "react-i18next";

interface ContactComboboxProps {
  contacts?: ClientContact[];
  clientId?: string;
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onCreateNew?: () => void;
}

export const ContactCombobox: React.FC<ContactComboboxProps> = ({
  contacts: propContacts,
  clientId,
  value,
  onValueChange,
  placeholder,
  disabled = false,
  className,
  onCreateNew
}) => {
  const { t } = useTranslation('clients');
  const [open, setOpen] = React.useState(false);
  
  // Use the hook to fetch contacts if clientId is provided
  const { data: fetchedContacts = [] } = useClientContacts(clientId || "");
  
  // Use either prop contacts or fetched contacts
  const contacts = propContacts || (clientId ? fetchedContacts : []);
  
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
          <span className="truncate">{t('messages.no_contacts_available')}</span>
        </div>
      </Button>
    );
  }

  // Custom filter function for consecutive character matching
  const filterContacts = (value: string, search: string) => {
    const searchLower = search.toLowerCase();
    const valueLower = value.toLowerCase();
    
    // If search is empty, show all
    if (!searchLower) return 1;
    
    // Check if search term appears as consecutive characters in value
    return valueLower.includes(searchLower) ? 1 : 0;
  };

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
              {selectedContact ? selectedContact.name : (placeholder || t('actions.select_contact'))}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[280px] p-0">
        <Command filter={filterContacts}>
          <div className="flex items-center border-b px-3">
            <CommandInput 
              placeholder={t('actions.search_placeholder')} 
              className="flex-1"
            />
            {onCreateNew && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  onCreateNew();
                }}
                className="ml-2 h-8 shrink-0"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('actions.create')}
              </Button>
            )}
          </div>
          <CommandList>
            <CommandEmpty>{t('messages.no_clients_found')}</CommandEmpty>
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