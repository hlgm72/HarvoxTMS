import * as React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { DayPicker, DropdownProps } from "react-day-picker";
import { es } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "react-i18next";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  onClear?: () => void;
  onToday?: () => void;
  showFooterButtons?: boolean;
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  fromYear = 2020,
  toYear = 2030,
  onClear,
  onToday,
  showFooterButtons = true,
  ...props
}: CalendarProps) {
  const { i18n, t } = useTranslation();
  const locale = i18n.language === 'es' ? es : undefined;
  
  return (
    <div className="relative">
      <DayPicker
        weekStartsOn={1}
        showOutsideDays={showOutsideDays}
        fromYear={fromYear}
        toYear={toYear}
        captionLayout="dropdown"
        locale={locale}
        className={cn("p-3", className)}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center gap-1",
          caption_label: "hidden",
          caption_dropdowns: "flex items-center gap-1",
          dropdown_month: "text-sm bg-primary/10 border-2 border-primary/20 rounded-lg px-3 py-2 min-w-[90px] h-9 cursor-pointer hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm font-medium",
          dropdown_year: "text-sm bg-primary/10 border-2 border-primary/20 rounded-lg px-3 py-2 min-w-[70px] h-9 cursor-pointer hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm font-medium",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "ghost" }),
            "h-7 w-7 bg-transparent p-0 hover:bg-accent"
          ),
          nav_button_previous: "absolute -left-2",
          nav_button_next: "absolute -right-2",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell:
            "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={{
          IconLeft: ({ ..._props }) => <ChevronUp className="h-4 w-4" />,
          IconRight: ({ ..._props }) => <ChevronDown className="h-4 w-4" />,
          Dropdown: ({ value, onChange, children, ...props }: DropdownProps) => {
            const options = React.Children.toArray(children) as React.ReactElement<React.HTMLProps<HTMLOptionElement>>[];
            const selected = options.find((child) => child.props.value === value);
            
            const handleChange = (value: string) => {
              const changeEvent = {
                target: { value },
              } as React.ChangeEvent<HTMLSelectElement>;
              onChange?.(changeEvent);
            };
            
            return (
              <select
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                className="text-sm bg-background border border-input rounded-md px-2 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
              >
                {options.map((option, id: number) => (
                  <option
                    key={`${option.props.value}-${id}`}
                    value={option.props.value?.toString() ?? ""}
                    disabled={option.props.disabled}
                  >
                    {option.props.children}
                  </option>
                ))}
              </select>
            );
          },
        }}
        {...props}
      />
      {showFooterButtons && (
        <div className="flex justify-between items-center px-3 pb-3 pt-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-primary hover:text-primary hover:bg-primary/10"
          >
            {t('common:clear', 'Clear')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToday}
            className="text-primary hover:text-primary hover:bg-primary/10"
          >
            {t('common:today', 'Today')}
          </Button>
        </div>
      )}
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
