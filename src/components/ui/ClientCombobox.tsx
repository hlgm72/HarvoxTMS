import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useClientSearch } from "@/hooks/useClientSearch";
import { useDebounce } from "use-debounce";

interface ClientComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ClientCombobox({
  value,
  onValueChange,
  placeholder = "Search client...",
  disabled = false,
}: ClientComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [selectedLabel, setSelectedLabel] = useState<string>("All");

  const { data: clients = [], isLoading } = useClientSearch(
    debouncedSearchTerm,
    open && debouncedSearchTerm.length >= 3
  );

  // Update selected label when value changes
  useEffect(() => {
    if (value === "all") {
      setSelectedLabel("All");
    } else if (value && clients.length > 0) {
      const selected = clients.find(c => c.id === value);
      if (selected) {
        setSelectedLabel(selected.name);
      }
    }
  }, [value, clients]);

  const handleSelect = (clientId: string, clientName: string) => {
    onValueChange(clientId);
    setSelectedLabel(clientName);
    setOpen(false);
    setSearchTerm("");
  };

  const handleClear = () => {
    onValueChange("all");
    setSelectedLabel("All");
    setSearchTerm("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setSearchTerm("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {/* Option: All */}
          <div
            className={cn(
              "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
              value === "all" && "bg-accent"
            )}
            onClick={() => handleSelect("all", "All")}
          >
            <Check
              className={cn(
                "mr-2 h-4 w-4",
                value === "all" ? "opacity-100" : "opacity-0"
              )}
            />
            <span className="font-medium">All</span>
          </div>

          {/* Search prompt */}
          {searchTerm.length < 3 && searchTerm.length > 0 && (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              Type at least 3 characters to search...
            </div>
          )}

          {/* Loading state */}
          {isLoading && debouncedSearchTerm.length >= 3 && (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          )}

          {/* No results */}
          {!isLoading && 
           debouncedSearchTerm.length >= 3 && 
           clients.length === 0 && (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              No clients found.
            </div>
          )}

          {/* Results */}
          {clients.map((client) => (
            <div
              key={client.id}
              className={cn(
                "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                value === client.id && "bg-accent"
              )}
              onClick={() => handleSelect(client.id, client.name)}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  value === client.id ? "opacity-100" : "opacity-0"
                )}
              />
              <div className="flex flex-col">
                <span className="font-medium">{client.name}</span>
                <span className="text-xs text-muted-foreground">
                  {[
                    client.dot_number && `DOT: ${client.dot_number}`,
                    client.mc_number && `MC: ${client.mc_number}`,
                  ]
                    .filter(Boolean)
                    .join(" • ") || "No DOT/MC"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
