import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
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
        <CardTitle className="text-xs md:text-sm font-body font-medium text-muted-foreground leading-tight">
          {title}
        </CardTitle>
        <div className="flex-shrink-0">{icon}</div>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-xl md:text-2xl font-heading font-bold text-foreground">
          {value}
        </div>
        {trend && (
          <p className={cn(
            "text-xs font-body flex items-center gap-1",
            trend.isPositive ? "text-success" : "text-destructive"
          )}>
            <span className={trend.isPositive ? "↗️" : "↘️"}>
              {Math.abs(trend.value)}%
            </span>
            <span className="hidden sm:inline">vs semana anterior</span>
            <span className="sm:hidden">vs anterior</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}