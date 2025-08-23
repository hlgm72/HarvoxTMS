import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Users, UserCheck } from "lucide-react";
import { useTranslation } from 'react-i18next';

interface UserTypeSelectorProps {
  value: "driver" | "dispatcher";
  onChange: (value: "driver" | "dispatcher") => void;
  label?: string;
  disabled?: boolean;
}

export function UserTypeSelector({ 
  value, 
  onChange, 
  label,
  disabled = false 
}: UserTypeSelectorProps) {
  const { t } = useTranslation('payments');
  
  return (
    <div className="space-y-2">
      <Label htmlFor="user-type">{label || t("deductions.form.user_type")}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={t("deductions.form.select_user_type")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="driver">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              {t("deductions.form.driver")}
            </div>
          </SelectItem>
          <SelectItem value="dispatcher">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t("deductions.form.dispatcher")}
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}