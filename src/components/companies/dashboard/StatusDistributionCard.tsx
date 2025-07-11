import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StatusDistributionCardProps {
  data: Array<{ name: string; value: number }>;
}

export function StatusDistributionCard({ data }: StatusDistributionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Estado de las Empresas</CardTitle>
        <CardDescription>Distribución por estado de actividad</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {data.map((status) => (
            <div key={status.name} className="p-4 border rounded-lg">
              <div className="font-medium">{status.name}</div>
              <div className="text-2xl font-bold">{status.value}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}