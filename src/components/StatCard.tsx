import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: string; positive: boolean };
  className?: string;
}

export default function StatCard({ title, value, subtitle, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn("bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-card-hover transition-shadow", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {trend && (
            <p className={cn("text-xs font-medium", trend.positive ? "text-success" : "text-destructive")}>
              {trend.positive ? "↑" : "↓"} {trend.value}
            </p>
          )}
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-accent-foreground">
          {icon}
        </div>
      </div>
    </div>
  );
}
