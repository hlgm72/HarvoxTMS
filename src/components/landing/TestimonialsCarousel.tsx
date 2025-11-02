import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface Testimonial {
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  initials: string;
}

const testimonials: Testimonial[] = [
  {
    name: "Carlos Rodríguez",
    role: "Director de Operaciones",
    company: "TransCargo Express",
    content: "Harvox TMS transformó completamente nuestra operación. Redujimos costos en un 30% y mejoramos la eficiencia de rutas significativamente.",
    rating: 5,
    initials: "CR"
  },
  {
    name: "María González",
    role: "CEO",
    company: "FleetMaster Logistics",
    content: "La mejor inversión que hemos hecho. El tracking en tiempo real y los reportes automáticos nos ahorraron horas de trabajo administrativo.",
    rating: 5,
    initials: "MG"
  },
  {
    name: "Juan Martínez",
    role: "Gerente de Flota",
    company: "Rutas del Norte",
    content: "Excelente plataforma. El soporte es increíble y la integración con Geotab fue perfecta. Altamente recomendado.",
    rating: 5,
    initials: "JM"
  },
  {
    name: "Ana Sánchez",
    role: "Directora de Logística",
    company: "Transporte Nacional",
    content: "Desde que usamos Harvox TMS, nuestro cumplimiento DOT es impecable y los conductores están más satisfechos con la gestión digital.",
    rating: 5,
    initials: "AS"
  }
];

export function TestimonialsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const { t } = useTranslation(['landing']);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const currentTestimonial = testimonials[currentIndex];

  return (
    <div className="relative max-w-4xl mx-auto">
      <Card className="border-none shadow-2xl bg-card overflow-hidden">
        <CardContent className="p-8 md:p-12">
          <div className="flex items-center gap-1 mb-6 justify-center">
            {[...Array(currentTestimonial.rating)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            ))}
          </div>

          <blockquote className="text-xl md:text-2xl text-center text-foreground mb-8 leading-relaxed">
            "{currentTestimonial.content}"
          </blockquote>

          <div className="flex items-center justify-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-primary">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                {currentTestimonial.initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <div className="font-bold text-lg text-foreground">
                {currentTestimonial.name}
              </div>
              <div className="text-muted-foreground">
                {currentTestimonial.role}
              </div>
              <div className="text-sm text-primary font-medium">
                {currentTestimonial.company}
              </div>
            </div>
          </div>

          <div className="flex justify-center items-center gap-4 mt-8">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrevious}
              className="rounded-full"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentIndex(index);
                    setIsAutoPlaying(false);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex 
                      ? 'w-8 bg-primary' 
                      : 'w-2 bg-muted-foreground/30'
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={goToNext}
              className="rounded-full"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
