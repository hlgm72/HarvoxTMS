import { Badge } from "@/components/ui/badge";
import { useTranslation } from 'react-i18next';

interface PlanBadgeProps {
  planType?: string;
}

export function PlanBadge({ planType }: PlanBadgeProps) {
  const { t } = useTranslation('admin');
  
  switch (planType) {
    case 'basic':
      return <Badge variant="outline">{t('pages.companies.plans.basic')}</Badge>;
    case 'premium':
      return <Badge variant="default" className="bg-blue-500">{t('pages.companies.plans.premium')}</Badge>;
    case 'enterprise':
      return <Badge variant="default" className="bg-purple-500">{t('pages.companies.plans.enterprise')}</Badge>;
    case 'trial':
      return <Badge variant="secondary">{t('pages.companies.plans.trial')}</Badge>;
    case 'demo':
      return <Badge variant="secondary">{t('pages.companies.plans.demo')}</Badge>;
    default:
      return <Badge variant="outline">{t('pages.companies.plans.basic')}</Badge>;
  }
}