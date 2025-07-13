import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "success" | "warning" | "destructive";
}

export function StatsCard({ 
  title, 
  value, 
  icon, 
  trend, 
  variant = "default" 
}: StatsCardProps) {
  return (
    <Card className={cn(
      "transition-all duration-300 hover:shadow-elegant animate-fade-in",
      variant === "success" && "border-success/20 bg-gradient-to-br from-success/5 to-success/10",
      variant === "warning" && "border-warning/20 bg-gradient-to-br from-warning/5 to-warning/10",
      variant === "destructive" && "border-destructive/20 bg-gradient-to-br from-destructive/5 to-destructive/10"
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <span className="text-2xl">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground mb-1">
          {value}
        </div>
        {trend && (
          <p className={cn(
            "text-xs flex items-center gap-1",
            trend.isPositive ? "text-success" : "text-destructive"
          )}>
            <span className={trend.isPositive ? "↗️" : "↘️"}>
              {Math.abs(trend.value)}%
            </span>
            vs semana anterior
          </p>
        )}
      </CardContent>
    </Card>
  );
}