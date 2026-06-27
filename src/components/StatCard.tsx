import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

type StatVariant = "default" | "success" | "warning" | "danger" | "sage";

const variantAccent: Record<StatVariant, string> = {
  default:  "bg-primary/8 border-primary/20",
  success:  "bg-success/8 border-success/20",
  warning:  "bg-warning/8 border-warning/20",
  danger:   "bg-destructive/8 border-destructive/20",
  sage:     "bg-accent/60 border-accent-foreground/20",
};

const variantIconBg: Record<StatVariant, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger:  "bg-destructive/10 text-destructive",
  sage:    "bg-accent text-accent-foreground",
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: string; positive: boolean };
  variant?: StatVariant;
  className?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = "default",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative bg-card rounded-[24px] border border-border p-6 shadow-card",
        "transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_30px_rgb(0,0,0,0.06)] hover:border-[#d8cfc0] group",
        className
      )}
    >
      {/* Top row: label + icon */}
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground tracking-wide leading-none">
          {title}
        </p>
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110",
            variantIconBg[variant]
          )}
        >
          <span className="[&_svg]:w-4 [&_svg]:h-4 [&_svg]:stroke-[1.5]">{icon}</span>
        </div>
      </div>

      {/* Value */}
      <p className="font-editorial text-4xl text-foreground leading-none tracking-tight mb-3 transition-colors duration-300">
        {value}
      </p>

      {/* Trend / subtitle */}
      <div className="flex items-center gap-2">
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              trend.positive ? "text-success" : "text-destructive"
            )}
          >
            {trend.positive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trend.value}
          </span>
        )}
        {subtitle && (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
