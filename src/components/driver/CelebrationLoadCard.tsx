import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface CelebrationLoadCardProps {
  load: {
    id: string;
    load_number: string;
    client_name: string;
  };
  showCelebration: boolean;
}

export function CelebrationLoadCard({ load, showCelebration }: CelebrationLoadCardProps) {
  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-500",
        showCelebration && [
          "animate-pulse",
          "shadow-lg shadow-green-500/30", 
          "border-green-500 border-2"
        ]
      )}
    >
      {showCelebration && (
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-green-400/10 animate-pulse" />
      )}
      
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <span>{load.load_number}</span>
            {showCelebration && (
              <CheckCircle className="h-6 w-6 text-green-500 animate-scale-in" />
            )}
          </div>
        </CardTitle>
        <p className="text-sm text-muted-foreground font-medium">
          {load.client_name}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progreso</span>
            <span className="font-medium">100%</span>
          </div>
          <Progress 
            value={100} 
            className={cn(
              "h-2 transition-all duration-500",
              showCelebration && "shadow-md shadow-green-500/50"
            )}
          />
        </div>
        
        {showCelebration && (
          <div className="text-center py-2 animate-fade-in">
            <p className="text-green-600 font-semibold text-sm">
              🎉 ¡Carga Completada!
            </p>
            <p className="text-xs text-muted-foreground">
              Moviendo a historial...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}