import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface GeographicDistributionCardProps {
  data: Array<{ state: string; empresas: number }>;
}

export function GeographicDistributionCard({ data }: GeographicDistributionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribución Geográfica</CardTitle>
        <CardDescription>Empresas por estado</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {data.map((item) => (
            <div key={item.state} className="flex justify-between items-center p-2 bg-muted rounded">
              <span className="font-medium">{item.state}</span>
              <span className="text-lg font-bold">{item.empresas}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}