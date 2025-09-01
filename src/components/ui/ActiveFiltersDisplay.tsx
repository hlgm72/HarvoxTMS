import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FilterX, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterBadge {
  key: string;
  label: string;
  value?: string;
}

interface ActiveFiltersDisplayProps {
  filters: Record<string, any>;
  getFilterBadges: (filters: any, additionalData?: any) => FilterBadge[];
  hasActiveFilters: (filters: any) => boolean;
  onClearFilters: () => void;
  additionalData?: any;
  className?: string;
}

export function ActiveFiltersDisplay({
  filters,
  getFilterBadges,
  hasActiveFilters,
  onClearFilters,
  additionalData = {},
  className
}: ActiveFiltersDisplayProps) {
  const { t } = useTranslation(['common']);
  
  const isActive = hasActiveFilters(filters);
  const activeBadges = isActive ? getFilterBadges(filters, additionalData) : [];

  if (!isActive) {
    return null;
  }

  return (
    <Card className={cn("border-l-4 border-l-primary bg-muted/30", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4 text-primary" />
              <span>{t('active_filters.title', 'Filtros aplicados')}:</span>
            </div>
            
            <div className="flex flex-wrap gap-2 flex-1 min-w-0">
              {activeBadges.map((badge) => (
                <Badge 
                  key={badge.key} 
                  variant="secondary" 
                  className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                >
                  {badge.label}
                </Badge>
              ))}
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onClearFilters}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <FilterX className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{t('active_filters.clear', 'Limpiar filtros')}</span>
            <span className="sm:hidden">{t('active_filters.clear_short', 'Limpiar')}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}