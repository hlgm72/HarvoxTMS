import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from 'react-i18next';

interface PlanDistributionCardProps {
  data: Array<{ name: string; value: number }>;
}

export function PlanDistributionCard({ data }: PlanDistributionCardProps) {
  const { t } = useTranslation('admin');
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('pages.companies.stats.plan_distribution')}</CardTitle>
        <CardDescription>{t('pages.companies.stats.plan_distribution_desc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {data.map((plan) => (
            <div key={plan.name} className="p-4 border rounded-lg">
              <div className="font-medium">{plan.name}</div>
              <div className="text-2xl font-bold">{plan.value}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}