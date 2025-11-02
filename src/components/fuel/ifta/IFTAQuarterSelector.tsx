import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";

interface IFTAQuarterSelectorProps {
  year: number;
  quarter: number;
  onYearChange: (year: number) => void;
  onQuarterChange: (quarter: number) => void;
}

export const IFTAQuarterSelector = ({
  year,
  quarter,
  onYearChange,
  onQuarterChange,
}: IFTAQuarterSelectorProps) => {
  const { t } = useTranslation();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="flex gap-4 items-center">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">{t("fuel.ifta.year")}</label>
        <Select value={year.toString()} onValueChange={(v) => onYearChange(parseInt(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">{t("fuel.ifta.quarter")}</label>
        <Select value={quarter.toString()} onValueChange={(v) => onQuarterChange(parseInt(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">{t("fuel.ifta.q1")}</SelectItem>
            <SelectItem value="2">{t("fuel.ifta.q2")}</SelectItem>
            <SelectItem value="3">{t("fuel.ifta.q3")}</SelectItem>
            <SelectItem value="4">{t("fuel.ifta.q4")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
