import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from 'react-i18next';

interface MonthlyGrowthCardProps {
  data: Array<{ month: string; empresas: number }>;
}

export function MonthlyGrowthCard({ data }: MonthlyGrowthCardProps) {
  const { t } = useTranslation('admin');
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('pages.companies.stats.monthly_growth')}</CardTitle>
        <CardDescription>{t('pages.companies.stats.monthly_growth_desc')}</CardDescription>
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