import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface MonthlyGrowthCardProps {
  data: Array<{ month: string; empresas: number }>;
}

export function MonthlyGrowthCard({ data }: MonthlyGrowthCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Crecimiento Mensual</CardTitle>
        <CardDescription>Nuevas empresas por mes (últimos 12 meses)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {data.map((item) => (
            <div key={item.month} className="flex justify-between items-center p-2 bg-muted rounded">
              <span className="font-medium">{item.month}</span>
              <span className="text-lg font-bold">{item.empresas}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}