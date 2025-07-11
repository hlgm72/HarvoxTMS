import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Company } from "@/types/company";
import { PlanBadge } from "../PlanBadge";

interface RecentCompaniesCardProps {
  companies: Company[];
}

export function RecentCompaniesCard({ companies }: RecentCompaniesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Empresas Recientes</CardTitle>
        <CardDescription>Últimas 5 empresas registradas (30 días)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {companies.map((company) => (
            <div key={company.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div>
                  <div className="font-medium">{company.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(company.created_at).toLocaleDateString('es-ES')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <PlanBadge planType={company.plan_type} />
                <div className="text-sm text-muted-foreground">
                  {company.state_id}
                </div>
              </div>
            </div>
          ))}
          {companies.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              No hay empresas recientes
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}