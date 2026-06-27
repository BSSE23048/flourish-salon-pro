import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

export type AppointmentStatus = "Booked" | "Completed" | "Cancelled";

const statusConfig: Record<
  AppointmentStatus,
  { className: string; dotColor: string; icon: React.ElementType }
> = {
  Booked:    { className: "bg-primary/8 text-primary border border-primary/20",       dotColor: "bg-primary",     icon: Clock },
  Completed: { className: "bg-success/8 text-success border border-success/20",       dotColor: "bg-success",     icon: CheckCircle2 },
  Cancelled: { className: "bg-destructive/8 text-destructive border border-destructive/20", dotColor: "bg-destructive", icon: XCircle },
};

interface DataTableProps<T> {
  columns: { key: string; label: string; render?: (item: T) => React.ReactNode }[];
  data: T[];
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  emptyMessage = "No data found",
  emptyIcon,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
        {emptyIcon ? (
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4 [&_svg]:w-7 [&_svg]:h-7 [&_svg]:text-muted-foreground [&_svg]:stroke-[1.2]">
            {emptyIcon}
          </div>
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30" />
          </div>
        )}
        <p className="text-base font-medium text-foreground mb-1">{emptyMessage}</p>
        <p className="text-sm text-muted-foreground">Nothing to display here yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-[0.1em] py-4 px-6 first:pl-6 last:pr-6 whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr
              key={i}
              className="border-b border-border/60 last:border-0 hover:bg-muted/40 transition-colors duration-100 group"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="py-4 px-6 first:pl-6 last:pr-6 text-sm text-foreground"
                >
                  {col.render ? col.render(item) : (item[col.key] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        config.className
      )}
    >
      <Icon className="w-3 h-3 stroke-[2]" />
      {status}
    </span>
  );
}
