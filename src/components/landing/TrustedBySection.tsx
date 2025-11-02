import { useTranslation } from 'react-i18next';
import { Building2 } from 'lucide-react';

const companies = [
  "TransCargo Express",
  "FleetMaster Logistics",
  "Rutas del Norte",
  "Transporte Nacional",
  "Cargo Solutions",
  "Express Delivery Co"
];

export function TrustedBySection() {
  const { t } = useTranslation(['landing']);

  return (
    <section className="py-16 bg-muted/30 border-y border-border/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Confían en Nosotros
          </p>
          <h3 className="text-2xl md:text-3xl font-bold text-foreground">
            Más de 500 empresas líderes usan Harvox TMS
          </h3>
        </div>

        <div className="relative overflow-hidden">
          <div className="flex trusted-logos-scroll">
            {[...companies, ...companies].map((company, index) => (
              <div
                key={index}
                className="flex-shrink-0 mx-8 flex items-center gap-3 px-6 py-4 bg-card rounded-lg border border-border/50 hover:border-primary/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <span className="text-lg font-semibold text-foreground whitespace-nowrap">
                  {company}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
