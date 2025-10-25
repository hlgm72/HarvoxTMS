import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  label?: string;
  id?: string;
}

export function TimePicker({ value, onChange, placeholder = "Select time", label, id }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hour, setHour] = useState<number>(12);
  const [minute, setMinute] = useState<number>(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

  // Parse existing value when component mounts or value changes
  useEffect(() => {
    if (value) {
      const [timeStr] = value.split(':');
      const hours = parseInt(timeStr);
      const mins = parseInt(value.split(':')[1] || '0');
      
      if (hours === 0) {
        setHour(12);
        setPeriod('AM');
      } else if (hours === 12) {
        setHour(12);
        setPeriod('PM');
      } else if (hours > 12) {
        setHour(hours - 12);
        setPeriod('PM');
      } else {
        setHour(hours);
        setPeriod('AM');
      }
      setMinute(mins);
    }
  }, [value]);

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const formatDisplayTime = () => {
    if (!value) return placeholder;
    const h = hour.toString().padStart(2, '0');
    const m = minute.toString().padStart(2, '0');
    return `${h}:${m} ${period}`;
  };

  const handleApply = () => {
    let hour24 = hour;
    if (period === 'AM' && hour === 12) {
      hour24 = 0;
    } else if (period === 'PM' && hour !== 12) {
      hour24 = hour + 12;
    }
    
    const timeString = `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    onChange(timeString);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setHour(12);
    setMinute(0);
    setPeriod('AM');
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <Clock className="mr-2 h-4 w-4" />
            {formatDisplayTime()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex gap-2 p-3">
            {/* Hours */}
            <div className="flex flex-col gap-1">
              <div className="text-xs font-medium text-center pb-1 text-muted-foreground">Hour</div>
              <ScrollArea className="h-48 w-16">
                <div className="flex flex-col gap-1 pr-3">
                  {hours.map((h) => (
                    <Button
                      key={h}
                      variant={hour === h ? "default" : "ghost"}
                      size="sm"
                      className="w-full"
                      onClick={() => setHour(h)}
                    >
                      {h}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Minutes */}
            <div className="flex flex-col gap-1">
              <div className="text-xs font-medium text-center pb-1 text-muted-foreground">Min</div>
              <ScrollArea className="h-48 w-16">
                <div className="flex flex-col gap-1 pr-3">
                  {minutes.map((m) => (
                    <Button
                      key={m}
                      variant={minute === m ? "default" : "ghost"}
                      size="sm"
                      className="w-full"
                      onClick={() => setMinute(m)}
                    >
                      {m.toString().padStart(2, '0')}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* AM/PM */}
            <div className="flex flex-col gap-1">
              <div className="text-xs font-medium text-center pb-1 text-muted-foreground">Period</div>
              <div className="flex flex-col gap-1">
                <Button
                  variant={period === 'AM' ? "default" : "ghost"}
                  size="sm"
                  className="w-16"
                  onClick={() => setPeriod('AM')}
                >
                  AM
                </Button>
                <Button
                  variant={period === 'PM' ? "default" : "ghost"}
                  size="sm"
                  className="w-16"
                  onClick={() => setPeriod('PM')}
                >
                  PM
                </Button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 p-3 pt-0 border-t">
            <Button variant="outline" size="sm" onClick={handleClear} className="flex-1">
              Clear
            </Button>
            <Button size="sm" onClick={handleApply} className="flex-1">
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}