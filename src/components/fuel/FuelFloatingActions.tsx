import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Filter, X, Settings } from 'lucide-react';
import { FuelFilters, FuelFiltersType } from './FuelFilters';

interface FuelFloatingActionsProps {
  filters: FuelFiltersType;
  onFiltersChange: (filters: FuelFiltersType) => void;
}

export function FuelFloatingActions({ filters, onFiltersChange }: FuelFloatingActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.driverId && filters.driverId !== 'all') count++;
    if (filters.status && filters.status !== 'all') count++;
    if (filters.vehicleId && filters.vehicleId !== 'all') count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    return count;
  };

  const clearAllFilters = () => {
    onFiltersChange({
      driverId: 'all',
      status: 'all',
      vehicleId: 'all',
      dateRange: { from: undefined, to: undefined }
    });
  };

  const activeCount = getActiveFiltersCount();

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full shadow-lg hover:shadow-xl transition-all duration-200 h-14 w-14 p-0"
        >
          <div className="relative">
            <Filter className="h-6 w-6" />
            {activeCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {activeCount}
              </Badge>
            )}
          </div>
        </Button>
      </div>

      {/* Filters Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-80 sm:w-96">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros de Combustible
                  {activeCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeCount}
                    </Badge>
                  )}
                </SheetTitle>
                <SheetDescription>
                  Filtra los gastos de combustible por diferentes criterios
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
                  Limpiar
                </Button>
              )}
            </div>
          </SheetHeader>
          
          <div className="mt-6">
            <FuelFilters 
              filters={filters} 
              onFiltersChange={onFiltersChange}
              compact
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}