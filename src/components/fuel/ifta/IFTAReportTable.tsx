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
import { formatDateAuto } from "@/lib/dateFormatting";

interface Transaction {
  id: string;
  transaction_date: string;
  station_name: string | null;
  gallons: number;
  price_per_gallon: number | null;
  total_amount: number | null;
}

interface StateData {
  state: string;
  gallons: number;
  transaction_count: number;
  transactions: Transaction[];
}

interface VehicleData {
  vehicle_id: string | null;
  vehicle_number: string | null;
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
  const { t } = useTranslation('fuel');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());

  const toggleRow = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  const toggleState = (key: string) => {
    const newExpanded = new Set(expandedStates);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedStates(newExpanded);
  };

  const formatGallons = (gallons: number) => gallons.toFixed(2);

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>{t("ifta.vehicle")}</TableHead>
            <TableHead>{t("ifta.driver")}</TableHead>
            <TableHead className="text-right">{t("ifta.transactions")}</TableHead>
            <TableHead className="text-right">{t("ifta.total_gallons")}</TableHead>
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
                <TableCell className="font-medium">
                  {vehicle.vehicle_number || '—'}
                </TableCell>
                <TableCell className="font-medium">{vehicle.driver_name}</TableCell>
                <TableCell className="text-right">{vehicle.transaction_count}</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatGallons(vehicle.total_gallons)}
                </TableCell>
              </TableRow>
            ];

            if (isExpanded) {
              rows.push(
                <TableRow key={`${key}-expanded`}>
                  <TableCell colSpan={5} className="bg-muted/30 p-0">
                    <div className="px-12 py-4">
                      <h4 className="text-sm font-medium mb-3">
                        {t("ifta.breakdown_by_state")}
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("ifta.state")}</TableHead>
                            <TableHead className="text-right">
                              {t("ifta.transactions")}
                            </TableHead>
                            <TableHead className="text-right">
                              {t("ifta.gallons")}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vehicle.states.map((state) => {
                            const stateKey = `${key}-${state.state}`;
                            const isStateExpanded = expandedStates.has(stateKey);
                            
                            return [
                              <TableRow 
                                key={state.state}
                                className="cursor-pointer hover:bg-muted/30"
                                onClick={() => toggleState(stateKey)}
                              >
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    {isStateExpanded ? (
                                      <ChevronDown className="h-3 w-3" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3" />
                                    )}
                                    {state.state}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  {state.transaction_count}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatGallons(state.gallons)}
                                </TableCell>
                              </TableRow>,
                              ...(isStateExpanded ? [
                                <TableRow key={`${state.state}-transactions`}>
                                  <TableCell colSpan={3} className="p-0 bg-muted/10">
                                    <div className="px-8 py-3">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>{t("ifta.date")}</TableHead>
                                            <TableHead>{t("ifta.station")}</TableHead>
                                            <TableHead className="text-right">{t("ifta.gallons")}</TableHead>
                                            <TableHead className="text-right">{t("ifta.price")}</TableHead>
                                            <TableHead className="text-right">{t("ifta.amount")}</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {state.transactions.map((transaction) => (
                                            <TableRow key={transaction.id}>
                                              <TableCell>
                                                {formatDateAuto(transaction.transaction_date)}
                                              </TableCell>
                                              <TableCell>{transaction.station_name || '—'}</TableCell>
                                              <TableCell className="text-right">
                                                {formatGallons(transaction.gallons)}
                                              </TableCell>
                                              <TableCell className="text-right">
                                                {transaction.price_per_gallon 
                                                  ? `$${transaction.price_per_gallon.toFixed(3)}` 
                                                  : '—'}
                                              </TableCell>
                                              <TableCell className="text-right">
                                                {transaction.total_amount 
                                                  ? `$${transaction.total_amount.toFixed(2)}` 
                                                  : '—'}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ] : [])
                            ];
                          }).flat()}
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
            <TableCell colSpan={2}>{t("ifta.company_total")}</TableCell>
            <TableCell className="text-right">{totalTransactions}</TableCell>
            <TableCell className="text-right">{formatGallons(totalGallons)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  );
};
