import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface StateData {
  state: string;
  gallons: number;
  transaction_count: number;
}

interface VehicleData {
  vehicle_id: string | null;
  driver_user_id: string;
  driver_name: string;
  total_gallons: number;
  transaction_count: number;
  states: StateData[];
}

interface IFTAReportTableProps {
  vehicles: VehicleData[];
  totalGallons: number;
  totalTransactions: number;
}

export const IFTAReportTable = ({
  vehicles,
  totalGallons,
  totalTransactions,
}: IFTAReportTableProps) => {
  const { t } = useTranslation();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  const formatGallons = (gallons: number) => gallons.toFixed(2);

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>{t("fuel.ifta.driver_vehicle")}</TableHead>
            <TableHead className="text-right">{t("fuel.ifta.total_gallons")}</TableHead>
            <TableHead className="text-right">{t("fuel.ifta.transactions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.flatMap((vehicle) => {
            const key = vehicle.vehicle_id || vehicle.driver_user_id;
            const isExpanded = expandedRows.has(key);

            const rows = [
              <TableRow
                key={key}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => toggleRow(key)}
              >
                <TableCell>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </TableCell>
                <TableCell className="font-medium">{vehicle.driver_name}</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatGallons(vehicle.total_gallons)}
                </TableCell>
                <TableCell className="text-right">{vehicle.transaction_count}</TableCell>
              </TableRow>
            ];

            if (isExpanded) {
              rows.push(
                <TableRow key={`${key}-expanded`}>
                  <TableCell colSpan={4} className="bg-muted/30 p-0">
                    <div className="px-12 py-4">
                      <h4 className="text-sm font-medium mb-3">
                        {t("fuel.ifta.breakdown_by_state")}
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("fuel.ifta.state")}</TableHead>
                            <TableHead className="text-right">
                              {t("fuel.ifta.gallons")}
                            </TableHead>
                            <TableHead className="text-right">
                              {t("fuel.ifta.transactions")}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vehicle.states.map((state) => (
                            <TableRow key={state.state}>
                              <TableCell className="font-medium">{state.state}</TableCell>
                              <TableCell className="text-right">
                                {formatGallons(state.gallons)}
                              </TableCell>
                              <TableCell className="text-right">
                                {state.transaction_count}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TableCell>
                </TableRow>
              );
            }

            return rows;
          })}
          <TableRow className="bg-primary/5 font-bold">
            <TableCell></TableCell>
            <TableCell>{t("fuel.ifta.company_total")}</TableCell>
            <TableCell className="text-right">{formatGallons(totalGallons)}</TableCell>
            <TableCell className="text-right">{totalTransactions}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  );
};
