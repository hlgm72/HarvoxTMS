import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Fuel, DollarSign, BarChart3, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useFuelStats } from '@/hooks/useFuelStats';
import { formatCurrency } from '@/lib/dateFormatting';

interface FuelStatsCardsProps {
  filters?: {
    periodId?: string;
    driverId?: string;
    startDate?: string;
    endDate?: string;
  };
}

export function FuelStatsCards({ filters = {} }: FuelStatsCardsProps) {
  const { data: stats, isLoading } = useFuelStats(filters);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }


  const formatGallons = (gallons: number) => {
    return `${gallons.toFixed(1)} gal`;
  };

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {/* Total Gastos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Total Gastos</CardTitle>
          <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-lg sm:text-2xl font-bold">
            {formatCurrency(stats?.totalAmount || 0)}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats?.totalExpenses || 0} transacciones
          </p>
        </CardContent>
      </Card>

      {/* Total Galones */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Total Galones</CardTitle>
          <Fuel className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-lg sm:text-2xl font-bold">
            {formatGallons(stats?.totalGallons || 0)}
          </div>
          <p className="text-xs text-muted-foreground">
            Promedio: {formatCurrency(stats?.averagePricePerGallon || 0)}/gal
          </p>
        </CardContent>
      </Card>

      {/* Estado de Gastos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Estado</CardTitle>
          <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1 sm:space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Clock className="h-2 w-2 sm:h-3 sm:w-3 text-yellow-500" />
                <span className="text-xs">Pendientes</span>
              </div>
              <Badge variant="secondary" className="text-xs px-1 sm:px-2">
                {stats?.pending || 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-2 w-2 sm:h-3 sm:w-3 text-green-500" />
                <span className="text-xs">Aprobados</span>
              </div>
              <Badge variant="secondary" className="text-xs px-1 sm:px-2">
                {stats?.approved || 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <AlertCircle className="h-2 w-2 sm:h-3 sm:w-3 text-blue-500" />
                <span className="text-xs">Verificados</span>
              </div>
              <Badge variant="secondary" className="text-xs px-1 sm:px-2">
                {stats?.verified || 0}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tendencia Mensual */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Tendencia</CardTitle>
          <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-lg sm:text-2xl font-bold">
            {stats?.monthlyData && stats.monthlyData.length > 0 
              ? formatCurrency(stats.monthlyData[stats.monthlyData.length - 1]?.amount || 0)
              : formatCurrency(0)
            }
          </div>
          <p className="text-xs text-muted-foreground">
            Este mes
          </p>
          {stats?.monthlyData && stats.monthlyData.length > 1 && (
            <div className="text-xs text-muted-foreground mt-1">
              {(() => {
                const current = stats.monthlyData[stats.monthlyData.length - 1]?.amount || 0;
                const previous = stats.monthlyData[stats.monthlyData.length - 2]?.amount || 0;
                const change = previous > 0 ? ((current - previous) / previous * 100) : 0;
                return (
                  <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {change >= 0 ? '+' : ''}{change.toFixed(1)}% vs anterior
                  </span>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}