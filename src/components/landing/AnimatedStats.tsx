import { useEffect, useRef, useState } from 'react';
import { TrendingUp, Users, Truck, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StatItemProps {
  icon: React.ElementType;
  value: number;
  suffix?: string;
  label: string;
  duration?: number;
}

function StatItem({ icon: Icon, value, suffix = '', label, duration = 2000 }: StatItemProps) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      setCount(Math.floor(progress * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [isVisible, value, duration]);

  return (
    <div 
      ref={ref}
      className="flex flex-col items-center p-8 rounded-2xl bg-card hover:bg-accent/5 transition-all duration-300 hover:scale-105 group"
    >
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <div className="text-4xl font-bold text-foreground mb-2">
        {count}{suffix}
      </div>
      <div className="text-muted-foreground text-center font-medium">
        {label}
      </div>
    </div>
  );
}

export function AnimatedStats() {
  const { t } = useTranslation(['landing']);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatItem
        icon={Users}
        value={500}
        suffix="+"
        label={t('landing:stats.active_companies')}
      />
      <StatItem
        icon={Truck}
        value={5000}
        suffix="+"
        label={t('landing:stats.monitored_vehicles')}
      />
      <StatItem
        icon={TrendingUp}
        value={25}
        suffix="%"
        label={t('landing:stats.average_savings')}
      />
      <StatItem
        icon={Shield}
        value={99}
        suffix="%"
        label={t('landing:stats.uptime')}
      />
    </div>
  );
}
