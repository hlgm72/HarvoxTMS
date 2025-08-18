import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { formatCurrency } from "@/lib/paymentCalculations";

interface WeeklyData {
  week: string;
  netIncome: number;
  grossEarnings: number;
  fuelExpenses: number;
  deductions: number;
}

interface DeductionData {
  name: string;
  value: number;
  color: string;
}

interface IncomeVsExpensesData {
  month: string;
  income: number;
  fuel: number;
  otherExpenses: number;
}

interface FinancialChartsProps {
  currentPeriodData: {
    gross_earnings: number;
    fuel_expenses: number;
    total_deductions: number;
    net_payment: number;
  };
  className?: string;
}

export function FinancialCharts({ currentPeriodData, className }: FinancialChartsProps) {
  // Generate mock data for the last 8 weeks
  const weeklyTrendData: WeeklyData[] = useMemo(() => {
    const weeks = [];
    const currentDate = new Date();
    
    for (let i = 7; i >= 0; i--) {
      const weekDate = new Date(currentDate);
      weekDate.setDate(currentDate.getDate() - (i * 7));
      
      const weekLabel = weekDate.toLocaleDateString('es-ES', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      // Generate realistic trending data
      const baseIncome = 1200 + (Math.random() * 400);
      const fuel = 150 + (Math.random() * 100);
      const deductions = 50 + (Math.random() * 50);
      
      weeks.push({
        week: weekLabel,
        netIncome: baseIncome - fuel - deductions,
        grossEarnings: baseIncome,
        fuelExpenses: fuel,
        deductions: deductions
      });
    }
    
    // Use current period data for the latest week
    if (weeks.length > 0) {
      const lastWeek = weeks[weeks.length - 1];
      lastWeek.grossEarnings = currentPeriodData.gross_earnings;
      lastWeek.fuelExpenses = currentPeriodData.fuel_expenses;
      lastWeek.deductions = currentPeriodData.total_deductions;
      lastWeek.netIncome = currentPeriodData.net_payment;
    }
    
    return weeks;
  }, [currentPeriodData]);

  // Generate income vs expenses comparison data
  const incomeVsExpensesData: IncomeVsExpensesData[] = useMemo(() => {
    const months = [];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthLabel = monthDate.toLocaleDateString('es-ES', { 
        month: 'short',
        year: '2-digit'
      });
      
      const income = 4800 + (Math.random() * 1600);
      const fuel = 600 + (Math.random() * 400);
      const other = 200 + (Math.random() * 200);
      
      months.push({
        month: monthLabel,
        income: income,
        fuel: fuel,
        otherExpenses: other
      });
    }
    
    return months;
  }, []);

  // Generate deductions breakdown
  const deductionsData: DeductionData[] = useMemo(() => {
    const totalDeductions = currentPeriodData.total_deductions || 300;
    const fuelExpenses = currentPeriodData.fuel_expenses || 150;
    
    // Calculate proportional breakdown
    const insurance = totalDeductions * 0.3;
    const truck_payment = totalDeductions * 0.4;
    const maintenance = totalDeductions * 0.2;
    const other = totalDeductions * 0.1;
    
    return [
      { 
        name: 'Combustible', 
        value: fuelExpenses, 
        color: 'hsl(var(--destructive))' 
      },
      { 
        name: 'Pago de Camión', 
        value: truck_payment, 
        color: 'hsl(var(--primary))' 
      },
      { 
        name: 'Seguro', 
        value: insurance, 
        color: 'hsl(var(--secondary))' 
      },
      { 
        name: 'Mantenimiento', 
        value: maintenance, 
        color: 'hsl(var(--accent))' 
      },
      { 
        name: 'Otros', 
        value: other, 
        color: 'hsl(var(--muted))' 
      }
    ].filter(item => item.value > 0);
  }, [currentPeriodData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.dataKey === 'netIncome' ? 'Ingreso Neto' : 
                 entry.dataKey === 'grossEarnings' ? 'Ingresos Brutos' :
                 entry.dataKey === 'fuelExpenses' ? 'Combustible' :
                 entry.dataKey === 'income' ? 'Ingresos' :
                 entry.dataKey === 'fuel' ? 'Combustible' :
                 entry.dataKey === 'otherExpenses' ? 'Otros Gastos' :
                 entry.dataKey}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm">{data.payload.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(data.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={className}>
      <Tabs defaultValue="trend" className="w-full">
        <TabsList className="grid w-full grid-cols-3 gap-1">
          <TabsTrigger value="trend" className="text-xs">
            <TrendingUp className="h-4 w-4 mr-1" />
            Tendencia
          </TabsTrigger>
          <TabsTrigger value="comparison" className="text-xs">
            <BarChart3 className="h-4 w-4 mr-1" />
            Comparación
          </TabsTrigger>
          <TabsTrigger value="breakdown" className="text-xs">
            <PieChartIcon className="h-4 w-4 mr-1" />
            Desglose
          </TabsTrigger>
        </TabsList>

        {/* Weekly Trend Chart */}
        <TabsContent value="trend">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Tendencia de Ingresos (8 Semanas)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="week" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="netIncome" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      name="Ingreso Neto"
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="grossEarnings" 
                      stroke="hsl(var(--secondary))" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Ingresos Brutos"
                      dot={{ fill: 'hsl(var(--secondary))', strokeWidth: 2, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Income vs Expenses Comparison */}
        <TabsContent value="comparison">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Ingresos vs Gastos (6 Meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={incomeVsExpensesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar 
                      dataKey="income" 
                      fill="hsl(var(--primary))" 
                      name="Ingresos"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="fuel" 
                      fill="hsl(var(--destructive))" 
                      name="Combustible"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="otherExpenses" 
                      fill="hsl(var(--muted))" 
                      name="Otros Gastos"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deductions Breakdown */}
        <TabsContent value="breakdown">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Desglose de Gastos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deductionsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {deductionsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => (
                        <span className="text-sm text-foreground">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Summary below chart */}
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-muted-foreground">Total Gastos</p>
                  <p className="font-bold text-lg">
                    {formatCurrency(deductionsData.reduce((sum, item) => sum + item.value, 0))}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Gasto Mayor</p>
                  <p className="font-bold text-lg">
                    {deductionsData.length > 0 ? deductionsData.reduce((max, item) => 
                      item.value > max.value ? item : max
                    ).name : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}