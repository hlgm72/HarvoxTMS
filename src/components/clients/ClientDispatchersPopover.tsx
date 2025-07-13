import { useState } from "react";
import { Users, Phone, Mail, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useClientDispatchers, useClientDispatcherCount } from "@/hooks/useClients";

interface ClientDispatchersPopoverProps {
  clientId: string;
  clientName: string;
}

export function ClientDispatchersPopover({ clientId, clientName }: ClientDispatchersPopoverProps) {
  const [open, setOpen] = useState(false);
  const { data: dispatcherCount = 0 } = useClientDispatcherCount(clientId);
  const { data: dispatchers = [], isLoading } = useClientDispatchers(clientId);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 px-2 gap-1.5 text-xs hover:bg-muted/50"
        >
          <Users className="h-3 w-3" />
          <span>{dispatcherCount}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm">Contactos de {clientName}</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {dispatcherCount} contacto{dispatcherCount !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              Cargando contactos...
            </div>
          ) : dispatchers.length === 0 ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              No hay contactos registrados
            </div>
          ) : (
            <div className="divide-y">
              {dispatchers.map((dispatcher, index) => (
                <div key={dispatcher.id} className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-muted">
                        {getInitials(dispatcher.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{dispatcher.name}</p>
                        <Badge 
                          variant={dispatcher.is_active ? "default" : "secondary"}
                          className="h-4 text-xs"
                        >
                          {dispatcher.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-xs text-muted-foreground ml-8">
                    {dispatcher.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{dispatcher.email}</span>
                      </div>
                    )}
                    {(dispatcher.phone_office || dispatcher.phone_mobile) && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3" />
                        <span className="truncate">
                          {dispatcher.phone_office || dispatcher.phone_mobile}
                          {dispatcher.extension && ` ext. ${dispatcher.extension}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}