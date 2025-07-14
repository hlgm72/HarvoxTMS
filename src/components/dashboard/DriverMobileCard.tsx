import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DriverVehicle {
  id: string;
  driverName: string;
  vehicleType: string;
  vehicleImage: string;
  mileage: string;
  rate: string;
  status: "active" | "inactive" | "maintenance";
}

interface DriverMobileCardProps {
  totalDrivers: number;
  vehicles: DriverVehicle[];
}

export function DriverMobileCard({ totalDrivers, vehicles }: DriverMobileCardProps) {
  return (
    <Card className="h-[400px] bg-gradient-to-br from-background to-blue-50/30 dark:to-blue-950/20 border-blue-200/50 dark:border-blue-800/50 hover:shadow-elegant transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-foreground">
            Driver Mobile
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Driver selection */}
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Honoqueer</span>
          <span className="ml-auto text-xs">▼</span>
        </div>
        
        {/* Location header */}
        <div className="text-sm font-medium text-foreground">Traonm blrt</div>
        
        {/* Vehicle list */}
        <div className="space-y-3">
          {vehicles.slice(0, 3).map((vehicle, index) => (
            <div key={vehicle.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-8 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center">
                  <span className="text-xs">🚛</span>
                </div>
                <div>
                  <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {vehicle.vehicleType}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {vehicle.mileage}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {vehicle.rate}
                </div>
                <div className="text-xs text-muted-foreground">
                  {index === 0 ? "2.36716" : index === 1 ? "19.355 i4u" : "2.63518"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}