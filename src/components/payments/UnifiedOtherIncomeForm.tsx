import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useCreateOtherIncome } from "@/hooks/useOtherIncome";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { useCompanyDrivers } from "@/hooks/useCompanyDrivers";
import { useConsolidatedDispatchers } from "@/hooks/useConsolidatedDispatchers";
import { useATMInput } from "@/hooks/useATMInput";
import { UserTypeSelector } from "@/components/ui/UserTypeSelector";

interface UnifiedOtherIncomeFormProps {
  onClose: () => void;
  defaultUserType?: "driver" | "dispatcher";
}

export function UnifiedOtherIncomeForm({ onClose, defaultUserType = "driver" }: UnifiedOtherIncomeFormProps) {
  const [description, setDescription] = useState("");
  const [incomeType, setIncomeType] = useState("");
  const [date, setDate] = useState<Date>();
  const [userType, setUserType] = useState<"driver" | "dispatcher">(defaultUserType);
  const [selectedUser, setSelectedUser] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const { user } = useAuth();
  const { selectedCompany } = useUserCompanies();
  const { drivers } = useCompanyDrivers();
  const { data: dispatchers = [] } = useConsolidatedDispatchers();
  const createOtherIncome = useCreateOtherIncome();
  const atmInput = useATMInput();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser || !date) {
      console.error("User or date not selected");
      return;
    }

    try {
      await createOtherIncome.mutateAsync({
        user_id: selectedUser,
        description,
        amount: atmInput.numericValue,
        income_type: incomeType,
        income_date: date.toISOString().split('T')[0],
        reference_number: referenceNumber || undefined,
        notes: notes || undefined,
        applied_to_role: userType,
        status: 'pending'
      });
      onClose();
    } catch (error) {
      console.error('Error creating other income:', error);
    }
  };

  const incomeTypes = [
    "Bonus",
    "Commission", 
    "Overtime",
    "Fuel Bonus",
    "Safety Bonus",
    "Referral Bonus",
    "Holiday Pay",
    "Other"
  ];

  const currentUsers = userType === "driver" ? drivers : dispatchers;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <UserTypeSelector
        value={userType}
        onChange={setUserType}
        label="Aplicar Ingreso a"
      />

      <div className="space-y-2">
        <Label htmlFor="user">
          {userType === "driver" ? "Conductor" : "Despachador"}
        </Label>
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger>
            <SelectValue placeholder={`Seleccionar ${userType === "driver" ? "conductor" : "despachador"}`} />
          </SelectTrigger>
          <SelectContent>
            {currentUsers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción del ingreso adicional"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Monto</Label>
        <Input
          id="amount"
          value={atmInput.displayValue}
          onChange={(e) => atmInput.setValue(parseFloat(e.target.value) || 0)}
          onKeyDown={atmInput.handleKeyDown}
          onPaste={atmInput.handlePaste}
          placeholder="$0.00"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Fecha del Ingreso</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Seleccionar fecha</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="income-type">Tipo de Ingreso</Label>
        <Select value={incomeType} onValueChange={setIncomeType}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar tipo de ingreso" />
          </SelectTrigger>
          <SelectContent>
            {incomeTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reference-number">Número de Referencia (Opcional)</Label>
        <Input
          id="reference-number"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          placeholder="Ej: REF-001"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas (Opcional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas adicionales sobre este ingreso"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={createOtherIncome.isPending || !selectedUser || !description || atmInput.numericValue <= 0 || !date}
        >
          {createOtherIncome.isPending ? "Creando..." : "Crear Ingreso"}
        </Button>
      </div>
    </form>
  );
}