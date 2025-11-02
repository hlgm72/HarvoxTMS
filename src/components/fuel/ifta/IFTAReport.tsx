import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IFTAQuarterSelector } from "./IFTAQuarterSelector";
import { IFTAReportTable } from "./IFTAReportTable";
import { IFTAStateSummary } from "./IFTAStateSummary";
import { useIFTAReport } from "@/hooks/useIFTAReport";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const IFTAReport = () => {
  const { t } = useTranslation();
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentQuarter = Math.floor(currentDate.getMonth() / 3) + 1;

  const [year, setYear] = useState(currentYear);
  const [quarter, setQuarter] = useState(currentQuarter);

  const { data, isLoading, error } = useIFTAReport({ year, quarter });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {t("common.error")}: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">
            {t("fuel.ifta.description")}
          </p>
        </div>
        <IFTAQuarterSelector
          year={year}
          quarter={quarter}
          onYearChange={setYear}
          onQuarterChange={setQuarter}
        />
      </div>

      {data && data.vehicles.length > 0 ? (
        <div className="space-y-6">
          <IFTAReportTable
            vehicles={data.vehicles}
            totalGallons={data.totalGallons}
            totalTransactions={data.totalTransactions}
          />
          <IFTAStateSummary stateSummary={data.stateSummary} />
        </div>
      ) : (
        <Alert>
          <AlertDescription>{t("fuel.ifta.no_data")}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};
