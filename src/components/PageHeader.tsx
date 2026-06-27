import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  eyebrow?: string;
}

export default function PageHeader({ title, subtitle, actions, className, eyebrow }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10 pb-6 border-b border-border", className)}>
      <div className="space-y-1.5">
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-[0.2em] font-medium text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="font-editorial text-4xl text-foreground leading-tight tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-base text-muted-foreground leading-relaxed max-w-xl">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
