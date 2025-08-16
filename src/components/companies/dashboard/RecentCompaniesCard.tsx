import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Company } from "@/types/company";
import { PlanBadge } from "../PlanBadge";
import { useTranslation } from 'react-i18next';
import { formatDateOnly } from '@/lib/dateFormatting';

interface RecentCompaniesCardProps {
  companies: Company[];
}

export function RecentCompaniesCard({ companies }: RecentCompaniesCardProps) {
  const { t } = useTranslation('admin');
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('pages.companies.stats.recent_companies')}</CardTitle>
        <CardDescription>{t('pages.companies.stats.recent_companies_desc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {companies.map((company) => (
            <div key={company.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div>
                  <div className="font-medium">{company.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDateOnly(company.created_at)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <PlanBadge planType={company.plan_type} />
                <div className="text-sm text-muted-foreground">
                  {company.state_id}
                </div>
              </div>
            </div>
          ))}
          {companies.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              {t('pages.companies.stats.no_recent_companies')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}