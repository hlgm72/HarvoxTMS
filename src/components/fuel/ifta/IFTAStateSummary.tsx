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
}

export const IFTAStateSummary = ({ stateSummary }: IFTAStateSummaryProps) => {
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
              <TableHead className="text-right">{t("ifta.total_gallons")}</TableHead>
              <TableHead className="text-right">{t("ifta.transactions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stateSummary.map((state) => (
              <TableRow key={state.state}>
                <TableCell className="font-medium">{state.state}</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatGallons(state.total_gallons)}
                </TableCell>
                <TableCell className="text-right">{state.transaction_count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
