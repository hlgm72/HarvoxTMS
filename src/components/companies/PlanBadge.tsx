import { Badge } from "@/components/ui/badge";

interface PlanBadgeProps {
  planType?: string;
}

export function PlanBadge({ planType }: PlanBadgeProps) {
  switch (planType) {
    case 'basic':
      return <Badge variant="outline">Básico</Badge>;
    case 'premium':
      return <Badge variant="default" className="bg-blue-500">Premium</Badge>;
    case 'enterprise':
      return <Badge variant="default" className="bg-purple-500">Enterprise</Badge>;
    case 'trial':
      return <Badge variant="secondary">Prueba</Badge>;
    case 'demo':
      return <Badge variant="secondary">Demo</Badge>;
    default:
      return <Badge variant="outline">Básico</Badge>;
  }
}