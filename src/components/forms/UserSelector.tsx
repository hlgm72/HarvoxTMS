import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  user_id: string;
  first_name: string;
  last_name: string;
  role: "driver" | "dispatcher";
}

interface UserSelectorProps {
  value: string;
  onChange: (userId: string) => void;
  userType: "driver" | "dispatcher";
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function UserSelector({ 
  value, 
  onChange, 
  userType,
  label,
  placeholder,
  disabled = false 
}: UserSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Obtener usuarios según el tipo seleccionado
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users-by-type', userType],
    queryFn: async () => {
      try {
        // Obtener los usuarios con rol específico de la compañía
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_company_roles')
          .select('user_id')
          .eq('role', userType)
          .eq('is_active', true);

        if (rolesError) throw rolesError;
        if (!userRoles || userRoles.length === 0) return [];

        // Obtener perfiles de estos usuarios
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', userRoles.map(r => r.user_id));

        if (profilesError) throw profilesError;

        return profiles?.map(profile => ({
          ...profile,
          role: userType
        })) || [];
      } catch (error) {
        console.error(`Error fetching ${userType}s:`, error);
        return [];
      }
    }
  });

  // Filtrar usuarios para búsqueda
  const filteredUsers = useMemo(() => {
    if (!searchValue) return users;
    
    return users.filter(user => {
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
      return fullName.includes(searchValue.toLowerCase());
    });
  }, [users, searchValue]);

  const selectedUser = users.find(user => user.user_id === value);

  const getDisplayName = (user: User) => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return fullName || user.user_id;
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            {selectedUser
              ? getDisplayName(selectedUser)
              : placeholder || `Seleccionar ${userType === 'driver' ? 'conductor' : 'despachador'}...`}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput 
              placeholder={`Buscar ${userType === 'driver' ? 'conductor' : 'despachador'}...`}
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>
                {isLoading 
                  ? `Cargando ${userType === 'driver' ? 'conductores' : 'despachadores'}...`
                  : `No se encontraron ${userType === 'driver' ? 'conductores' : 'despachadores'}.`
                }
              </CommandEmpty>
              <CommandGroup>
                {filteredUsers.map((user) => (
                  <CommandItem
                    key={user.user_id}
                    value={getDisplayName(user)}
                    onSelect={() => {
                      onChange(user.user_id);
                      setOpen(false);
                      setSearchValue("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === user.user_id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {getDisplayName(user)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}