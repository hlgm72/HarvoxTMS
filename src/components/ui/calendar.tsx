import * as React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { DayPicker, useNavigation, CaptionProps } from "react-day-picker";
import { es } from "date-fns/locale";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  onClear?: () => void;
  onToday?: () => void;
  showFooterButtons?: boolean;
  disableClear?: boolean;
  disableToday?: boolean;
  fromYear?: number;
  toYear?: number;
};

function CustomCaption(props: CaptionProps & { fromYear: number; toYear: number }) {
  const { goToMonth } = useNavigation();
  const { fromYear, toYear } = props;
  
  const currentMonth = props.displayMonth.getMonth();
  const currentYear = props.displayMonth.getFullYear();
  
  const [isEditingYear, setIsEditingYear] = React.useState(false);
  const [yearInput, setYearInput] = React.useState(currentYear.toString());
  const yearInputRef = React.useRef<HTMLInputElement>(null);
  
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  React.useEffect(() => {
    setYearInput(currentYear.toString());
  }, [currentYear]);
  
  React.useEffect(() => {
    if (isEditingYear && yearInputRef.current) {
      yearInputRef.current.select();
    }
  }, [isEditingYear]);
  
  const handlePreviousMonth = () => {
    const newDate = new Date(currentYear, currentMonth - 1, 1);
    goToMonth(newDate);
  };
  
  const handleNextMonth = () => {
    const newDate = new Date(currentYear, currentMonth + 1, 1);
    goToMonth(newDate);
  };
  
  const handlePreviousYear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newDate = new Date(currentYear - 1, currentMonth, 1);
    goToMonth(newDate);
  };
  
  const handleNextYear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newDate = new Date(currentYear + 1, currentMonth, 1);
    goToMonth(newDate);
  };
  
  const handleYearClick = () => {
    setIsEditingYear(true);
  };
  
  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setYearInput(value);
  };
  
  const handleYearBlur = () => {
    const year = parseInt(yearInput, 10);
    if (!isNaN(year) && year >= fromYear && year <= toYear) {
      const newDate = new Date(year, currentMonth, 1);
      goToMonth(newDate);
    } else {
      setYearInput(currentYear.toString());
    }
    setIsEditingYear(false);
  };
  
  const handleYearKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleYearBlur();
    } else if (e.key === 'Escape') {
      setYearInput(currentYear.toString());
      setIsEditingYear(false);
    }
  };
  
  return (
    <div className="flex justify-center items-center gap-2 py-2 pointer-events-auto bg-muted px-3">
      <div className="flex items-center gap-1 pointer-events-auto">
        <span className="text-sm font-medium min-w-[100px] text-center pointer-events-none">
          {months[currentMonth]}
        </span>
        <div className="flex flex-col pointer-events-auto">
          <button
            type="button"
            className="h-4 w-6 p-0 hover:bg-accent rounded flex items-center justify-center pointer-events-auto"
            onClick={handlePreviousMonth}
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="h-4 w-6 p-0 hover:bg-accent rounded flex items-center justify-center pointer-events-auto"
            onClick={handleNextMonth}
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>
      
      <div className="flex items-center gap-1 pointer-events-auto">
        {isEditingYear ? (
          <input
            ref={yearInputRef}
            type="text"
            value={yearInput}
            onChange={handleYearChange}
            onBlur={handleYearBlur}
            onKeyDown={handleYearKeyDown}
            className="text-sm font-medium w-[60px] text-center bg-transparent border border-border rounded px-1 focus:outline-none focus:ring-2 focus:ring-primary pointer-events-auto"
            maxLength={4}
          />
        ) : (
          <button
            type="button"
            onClick={handleYearClick}
            className="text-sm font-medium min-w-[60px] text-center hover:bg-accent rounded px-1 pointer-events-auto"
          >
            {currentYear}
          </button>
        )}
        <div className="flex flex-col pointer-events-auto">
          <button
            type="button"
            className="h-4 w-6 p-0 hover:bg-accent rounded flex items-center justify-center pointer-events-auto disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handlePreviousYear}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            disabled={currentYear <= fromYear}
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="h-4 w-6 p-0 hover:bg-accent rounded flex items-center justify-center pointer-events-auto disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleNextYear}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            disabled={currentYear >= toYear}
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  fromYear = 2020,
  toYear = 2030,
  onClear,
  onToday,
  showFooterButtons = true,
  disableClear = false,
  disableToday = false,
  ...props
}: CalendarProps) {
  const { i18n, t } = useTranslation();
  const locale = i18n.language === 'es' ? es : undefined;
  
  return (
    <div className="relative pointer-events-auto">
      <DayPicker
        weekStartsOn={1}
        showOutsideDays={showOutsideDays}
        locale={locale}
        className={cn("p-0 pointer-events-auto", className)}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-0",
          caption: "flex justify-center pt-1 relative items-center px-3 py-0",
          nav: "hidden",
          table: "w-full border-collapse px-3",
          head_row: "bg-muted",
          head_cell:
            "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem] py-2",
          row: "mt-1",
          cell: "h-8 w-8 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-8 w-8 p-0 font-normal aria-selected:opacity-100"
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
          Caption: (captionProps) => <CustomCaption {...captionProps} fromYear={fromYear} toYear={toYear} />,
        }}
        {...props}
      />
      {showFooterButtons && (
        <div className="flex justify-between items-center px-3 py-2 bg-muted pointer-events-auto">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClear?.();
            }}
            disabled={disableClear}
            className="text-primary hover:text-primary hover:bg-primary/10 pointer-events-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common:clear', 'Clear')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToday?.();
            }}
            disabled={disableToday}
            className="text-primary hover:text-primary hover:bg-primary/10 pointer-events-auto disabled:opacity-50 disabled:cursor-not-allowed"
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
