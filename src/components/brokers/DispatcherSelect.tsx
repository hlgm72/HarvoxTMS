import React from 'react';
import { BrokerDispatcher } from '@/hooks/useCompanyBrokers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Mail } from 'lucide-react';

interface DispatcherSelectProps {
  dispatchers: BrokerDispatcher[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DispatcherSelect({
  dispatchers,
  value,
  onValueChange,
  placeholder = "Seleccionar dispatcher",
  disabled = false
}: DispatcherSelectProps) {
  if (!dispatchers || dispatchers.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Sin dispatchers disponibles" />
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
        {dispatchers.map((dispatcher) => (
          <SelectItem key={dispatcher.id} value={dispatcher.id}>
            <div className="flex flex-col py-1">
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{dispatcher.name}</span>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                {dispatcher.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    <span>{dispatcher.email}</span>
                  </div>
                )}
                
                {(dispatcher.phone_office || dispatcher.phone_mobile) && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span>
                      {dispatcher.phone_office || dispatcher.phone_mobile}
                      {dispatcher.extension && ` ext. ${dispatcher.extension}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}