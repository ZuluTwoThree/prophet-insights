import { ChevronDown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { TIRMetrics } from "@/types/prophet";

interface DomainSelectorProps {
  domains: string[];
  selectedDomain: string;
  onSelectDomain: (domain: string) => void;
  metrics?: TIRMetrics[];
}

export function DomainSelector({
  domains,
  selectedDomain,
  onSelectDomain,
  metrics,
}: DomainSelectorProps) {
  const getMetricsForDomain = (domain: string) => {
    return metrics?.find((m) => m.domain === domain);
  };

  const selectedMetrics = getMetricsForDomain(selectedDomain);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="prophet" size="lg" className="min-w-[280px] justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-4 w-4" />
            <span className="font-medium">{selectedDomain}</span>
          </div>
          <div className="flex items-center gap-2">
            {selectedMetrics && (
              <Badge variant={selectedMetrics.trend}>
                TIR: {(selectedMetrics.tir * 100).toFixed(1)}%
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="start" 
        className="w-[320px] bg-popover border-border"
      >
        {domains.map((domain) => {
          const domainMetrics = getMetricsForDomain(domain);
          const isSelected = domain === selectedDomain;
          
          return (
            <DropdownMenuItem
              key={domain}
              onClick={() => onSelectDomain(domain)}
              className={`flex items-center justify-between py-3 px-4 cursor-pointer ${
                isSelected ? "bg-secondary" : ""
              }`}
            >
              <span className={isSelected ? "text-primary font-medium" : ""}>
                {domain}
              </span>
              {domainMetrics && (
                <Badge variant={domainMetrics.trend} className="text-xs">
                  {(domainMetrics.tir * 100).toFixed(1)}%
                </Badge>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
