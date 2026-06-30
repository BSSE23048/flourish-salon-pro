import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { DollarSign, TrendingUp, Scissors, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { API_UNAVAILABLE_MESSAGE, API_URL } from "@/lib/api";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

const dailySales = [
  { day: "Mon", sales: 12500 }, { day: "Tue", sales: 18000 }, { day: "Wed", sales: 15000 },
  { day: "Thu", sales: 22000 }, { day: "Fri", sales: 28000 }, { day: "Sat", sales: 35000 }, { day: "Sun", sales: 8000 },
];

const popularServices = [
  { name: "Haircut", value: 35 }, { name: "Facial", value: 25 },
  { name: "Nails", value: 20 }, { name: "Makeup", value: 12 }, { name: "Spa", value: 8 },
];

const pieColors = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))",
];

const peakHours = [
  { hour: "9AM", appointments: 2 }, { hour: "10AM", appointments: 5 }, { hour: "11AM", appointments: 7 },
  { hour: "12PM", appointments: 4 }, { hour: "1PM", appointments: 6 }, { hour: "2PM", appointments: 8 },
  { hour: "3PM", appointments: 9 }, { hour: "4PM", appointments: 7 }, { hour: "5PM", appointments: 10 },
  { hour: "6PM", appointments: 6 }, { hour: "7PM", appointments: 3 },
];

const staffRevenue = [
  { name: "Sara", revenue: 85000 }, { name: "Nadia", revenue: 72000 },
  { name: "Hina", revenue: 58000 }, { name: "Amina", revenue: 35000 }, { name: "Rukhsar", revenue: 44000 },
];

const tooltipStyle = {
  background: "hsl(40 30% 99%)",
  border: "1px solid hsl(35 22% 88%)",
  borderRadius: "12px",
  fontSize: "12px",
  boxShadow: "0 4px 12px hsl(25 20% 12% / 0.08)",
  padding: "10px 14px",
};

const axisStyle = { fontSize: 11, fill: "hsl(25 15% 48%)", fontFamily: "Satoshi" };

type Financials = {
  netRevenue: number;
  payrollPayable: number;
  profitAfterPayroll: number;
  invoiceCount: number;
};

const emptyFinancials: Financials = {
  netRevenue: 0,
  payrollPayable: 0,
  profitAfterPayroll: 0,
  invoiceCount: 0,
};

function asNumber(value: unknown) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function normalizeFinancials(value: unknown): Financials {
  const data = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    netRevenue: asNumber(data.netRevenue ?? data.revenue),
    payrollPayable: asNumber(data.payrollPayable ?? data.expenses),
    profitAfterPayroll: asNumber(data.profitAfterPayroll ?? data.netProfit),
    invoiceCount: asNumber(data.invoiceCount),
  };
}

function ChartCard({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
      <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-muted-foreground mb-1">{eyebrow}</p>
      <h3 className="font-editorial text-xl text-foreground tracking-tight mb-5">{title}</h3>
      {children}
    </div>
  );
}

export default function Reports() {
  const [financials, setFinancials] = useState<Financials>(emptyFinancials);

  useEffect(() => {
    fetch(`${API_URL}/api/financials`, { headers: { "x-role": "admin" } })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load reports");
        setFinancials(normalizeFinancials(data));
      })
      .catch((error) => {
        setFinancials(emptyFinancials);
        toast.error(error instanceof TypeError ? API_UNAVAILABLE_MESSAGE : error instanceof Error ? error.message : "Could not load reports");
      });
  }, []);

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Business insights to understand your growth and performance." eyebrow="Business" />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard title="Net Revenue" value={`Rs. ${financials.netRevenue.toLocaleString()}`} icon={<DollarSign />} subtitle={`${financials.invoiceCount} paid invoices`} variant="success" />
        <StatCard title="Payroll Cost" value={`Rs. ${financials.payrollPayable.toLocaleString()}`} icon={<Wallet />} subtitle="Salary + commission" />
        <StatCard title="Net Profit" value={`Rs. ${financials.profitAfterPayroll.toLocaleString()}`} icon={<TrendingUp />} trend={{ value: financials.profitAfterPayroll >= 0 ? "Positive" : "Loss", positive: financials.profitAfterPayroll >= 0 }} variant={financials.profitAfterPayroll >= 0 ? "success" : "danger"} />
        <StatCard title="Top Service" value="Haircut" icon={<Scissors />} subtitle="35% of all bookings" variant="sage" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Daily Sales" eyebrow="This Week">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dailySales} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="0" stroke="hsl(35 22% 88%)" vertical={false} />
              <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(35 22% 88% / 0.5)", radius: 4 }} />
              <Bar dataKey="sales" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Popular Services" eyebrow="Distribution">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={popularServices} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" paddingAngle={2}>
                {popularServices.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px", fontFamily: "Satoshi" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Peak Hours" eyebrow="Foot Traffic">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={peakHours}>
              <CartesianGrid strokeDasharray="0" stroke="hsl(35 22% 88%)" vertical={false} />
              <XAxis dataKey="hour" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="appointments" stroke="hsl(var(--chart-1))" strokeWidth={2.5} dot={{ fill: "hsl(var(--chart-1))", r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue by Staff" eyebrow="Team Performance">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={staffRevenue} layout="vertical" barCategoryGap="35%">
              <CartesianGrid strokeDasharray="0" stroke="hsl(35 22% 88%)" horizontal={false} />
              <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <YAxis type="category" dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} width={60} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="revenue" fill="hsl(var(--chart-2))" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
