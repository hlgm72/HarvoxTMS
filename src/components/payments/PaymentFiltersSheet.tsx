import React from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, X } from 'lucide-react';
import { PaymentFilters, PaymentFiltersType } from './PaymentFilters';
import { useTranslation } from 'react-i18next';

interface PaymentFiltersSheetProps {
  filters: PaymentFiltersType;
  onFiltersChange: (filters: PaymentFiltersType) => void;
  drivers: Array<{ user_id: string; first_name: string; last_name: string }>;
  children?: React.ReactNode;
}

export function PaymentFiltersSheet({ filters, onFiltersChange, drivers, children }: PaymentFiltersSheetProps) {
  const { t } = useTranslation('payments');
  const [open, setOpen] = React.useState(false);

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.driverId && filters.driverId !== 'all') count++;
    if (filters.status && filters.status !== 'all') count++;
    if (filters.periodFilter && filters.periodFilter.type !== 'current') count++;
    return count;
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      driverId: 'all',
      status: 'all',
      periodFilter: { type: 'current' }
    });
  };

  const activeCount = getActiveFiltersCount();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="relative">
            <Filter className="h-4 w-4 mr-2" />
            {t('filters.title')}
            {activeCount > 0 && (
              <Badge 
                variant="secondary" 
                className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {activeCount}
              </Badge>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>{t('filters.title')}</SheetTitle>
              <SheetDescription>
                {t('filters.sheet_description')}
              </SheetDescription>
            </div>
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                {t('filters.clear')}
              </Button>
            )}
          </div>
        </SheetHeader>
        
        <div className="mt-6">
          <PaymentFilters 
            filters={filters} 
            onFiltersChange={onFiltersChange}
            drivers={drivers}
            compact
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}