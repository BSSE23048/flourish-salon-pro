import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { DollarSign, TrendingUp, Scissors, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
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

export default function Reports() {
  const [financials, setFinancials] = useState({
    netRevenue: 0,
    payrollPayable: 0,
    profitAfterPayroll: 0,
    invoiceCount: 0,
  });

  useEffect(() => {
    fetch(`${API_URL}/api/financials`, { headers: { "x-role": "admin" } })
      .then((res) => res.json())
      .then((data) => setFinancials(data))
      .catch(() => undefined);
  }, []);

  return (
    <div>
      <PageHeader title="Reports & Analytics" subtitle="Insights to grow your business" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Net Revenue" value={`Rs. ${financials.netRevenue.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} subtitle={`${financials.invoiceCount} paid invoices`} />
        <StatCard title="Payroll Cost" value={`Rs. ${financials.payrollPayable.toLocaleString()}`} icon={<Wallet className="w-5 h-5" />} subtitle="Salary + commission" />
        <StatCard title="Profit After Payroll" value={`Rs. ${financials.profitAfterPayroll.toLocaleString()}`} icon={<TrendingUp className="w-5 h-5" />} trend={{ value: financials.profitAfterPayroll >= 0 ? "Positive" : "Loss", positive: financials.profitAfterPayroll >= 0 }} />
        <StatCard title="Top Service" value="Haircut" icon={<Scissors className="w-5 h-5" />} subtitle="Connected analytics next" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Daily Sales */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Daily Sales (This Week)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dailySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Popular Services */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Most Popular Services</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={popularServices} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {popularServices.map((_, i) => (
                  <Cell key={i} fill={pieColors[i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Hours */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Peak Hours</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={peakHours}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Line type="monotone" dataKey="appointments" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Staff */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Revenue by Staff</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={staffRevenue} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} width={60} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="revenue" fill="hsl(var(--chart-2))" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
