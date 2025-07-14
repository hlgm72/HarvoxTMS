import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, MapPin, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReversItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconColor: string;
  action?: string;
}

interface ReversMobileCardProps {
  items: ReversItem[];
}

export function ReversMobileCard({ items }: ReversMobileCardProps) {
  return (
    <Card className="h-[400px] bg-gradient-to-br from-background to-orange-50/30 dark:to-orange-950/20 border-orange-200/50 dark:border-orange-800/50 hover:shadow-elegant transition-all duration-300 relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-foreground">
            Revers Mobile
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Header image/icon */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-24 h-16 bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-2xl">🚛</span>
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
              <MapPin className="h-3 w-3 text-white" />
            </div>
          </div>
        </div>
        
        {/* Items list */}
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center`}
                  style={{ backgroundColor: `${item.iconColor}20` }}
                >
                  <span className="text-sm">{item.icon}</span>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {item.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.description}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.action && (
                  <Badge 
                    variant={index === 1 ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {item.action}
                  </Badge>
                )}
                {index === items.length - 1 && (
                  <div className="flex items-center gap-1">
                    <Menu className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Mover</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}