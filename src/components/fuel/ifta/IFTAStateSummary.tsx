import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "react-i18next";

interface StateSummaryData {
  state: string;
  total_gallons: number;
  transaction_count: number;
}

interface IFTAStateSummaryProps {
  stateSummary: StateSummaryData[];
  totalGallons: number;
  totalTransactions: number;
}

export const IFTAStateSummary = ({ stateSummary, totalGallons, totalTransactions }: IFTAStateSummaryProps) => {
  const { t } = useTranslation('fuel');

  const formatGallons = (gallons: number) => gallons.toFixed(2);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("ifta.state_summary")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("ifta.state")}</TableHead>
              <TableHead className="text-right">{t("ifta.transactions")}</TableHead>
              <TableHead className="text-right">{t("ifta.total_gallons")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stateSummary.map((state) => (
              <TableRow key={state.state}>
                <TableCell className="font-medium">{state.state}</TableCell>
                <TableCell className="text-right">{state.transaction_count}</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatGallons(state.total_gallons)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-primary/5 font-bold">
              <TableCell>{t("ifta.company_total")}</TableCell>
              <TableCell className="text-right">{totalTransactions}</TableCell>
              <TableCell className="text-right">{formatGallons(totalGallons)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
