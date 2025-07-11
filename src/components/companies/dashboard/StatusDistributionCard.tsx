import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from 'react-i18next';

interface StatusDistributionCardProps {
  data: Array<{ name: string; value: number }>;
}

export function StatusDistributionCard({ data }: StatusDistributionCardProps) {
  const { t } = useTranslation('admin');
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('pages.companies.stats.status_distribution')}</CardTitle>
        <CardDescription>{t('pages.companies.stats.status_distribution_desc')}</CardDescription>
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