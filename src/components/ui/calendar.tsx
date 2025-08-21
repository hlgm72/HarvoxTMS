import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  fromYear = 2020,
  toYear = 2030,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      weekStartsOn={1}
      showOutsideDays={showOutsideDays}
      fromYear={fromYear}
      toYear={toYear}
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
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
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
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
        Dropdown: (props) => {
          if (props.name === 'years') {
            return (
              <input
                type="number"
                min={fromYear}
                max={toYear}
                value={props.value}
                onChange={(e) => props.onChange?.(e as any)}
                className="text-sm bg-primary/10 border-2 border-primary/20 rounded-lg px-3 py-2 w-[85px] h-9 cursor-pointer hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm font-medium text-center"
              />
            );
          }
          return (
            <select
              value={props.value}
              onChange={(e) => props.onChange?.(e as any)}
              className="text-sm bg-primary/10 border-2 border-primary/20 rounded-lg px-3 py-2 min-w-[90px] h-9 cursor-pointer hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm font-medium"
            >
              {props.children}
            </select>
          );
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
