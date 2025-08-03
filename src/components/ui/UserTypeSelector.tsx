import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Users, UserCheck } from "lucide-react";

interface UserTypeSelectorProps {
  value: "driver" | "dispatcher";
  onChange: (value: "driver" | "dispatcher") => void;
  label?: string;
  disabled?: boolean;
}

export function UserTypeSelector({ 
  value, 
  onChange, 
  label = "Tipo de Usuario",
  disabled = false 
}: UserTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="user-type">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Seleccionar tipo de usuario" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="driver">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Conductor
            </div>
          </SelectItem>
          <SelectItem value="dispatcher">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Despachador
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}