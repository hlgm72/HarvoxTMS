import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useIFTAAvailableYears } from "@/hooks/useIFTAReport";
import { Loader2 } from "lucide-react";

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
  const { t } = useTranslation('fuel');
  const { data: availableYears, isLoading } = useIFTAAvailableYears();

  const currentYear = new Date().getFullYear();
  const years = availableYears && availableYears.length > 0 
    ? availableYears 
    : [currentYear];

  return (
    <div className="flex gap-4 items-center">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">{t("ifta.year")}</label>
        <Select 
          value={year.toString()} 
          onValueChange={(v) => onYearChange(parseInt(v))}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[120px] bg-white dark:bg-gray-800">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>...</span>
              </div>
            ) : (
              <SelectValue />
            )}
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-gray-800 z-50">
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">{t("ifta.quarter")}</label>
        <Select value={quarter.toString()} onValueChange={(v) => onQuarterChange(parseInt(v))}>
          <SelectTrigger className="w-[120px] bg-white dark:bg-gray-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-gray-800 z-50">
            <SelectItem value="1">{t("ifta.q1")}</SelectItem>
            <SelectItem value="2">{t("ifta.q2")}</SelectItem>
            <SelectItem value="3">{t("ifta.q3")}</SelectItem>
            <SelectItem value="4">{t("ifta.q4")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
