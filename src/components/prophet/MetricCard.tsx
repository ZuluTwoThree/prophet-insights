import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  icon?: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export function MetricCard({
  label,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  className,
  glow = false,
}: MetricCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-prophet-success" : trend === "down" ? "text-prophet-danger" : "text-muted-foreground";

  return (
    <div
      className={cn(
        "prophet-card p-5 relative overflow-hidden",
        glow && "prophet-glow",
        className
      )}
    >
      {/* Background glow effect */}
      {glow && (
        <div className="absolute inset-0 bg-prophet-glow opacity-50 pointer-events-none" />
      )}
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <span className="prophet-label">{label}</span>
          {icon && (
            <div className="text-primary/60">{icon}</div>
          )}
        </div>
        
        <div className="flex items-end gap-3">
          <span className="prophet-metric text-foreground">{value}</span>
          {trend && (
            <div className={cn("flex items-center gap-1 text-sm font-medium pb-0.5", trendColor)}>
              <TrendIcon className="h-4 w-4" />
              {trendValue && <span>{trendValue}</span>}
            </div>
          )}
        </div>
        
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
