import { useCallback, useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DollarSign, Plus, ReceiptText, Scissors, Trash2, TrendingUp, Wallet } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { API_URL, SOCKET_OPTIONS } from "@/lib/api";
import { localDateKey, localMonthKey } from "@/lib/date";
import { toast } from "sonner";

type Expense = {
  id: string;
  date: string;
  category: string;
  vendor?: string;
  description?: string;
  amount: number;
};

type Financials = {
  month: string;
  netRevenue: number;
  payrollPayable: number;
  expenseTotal: number;
  netProfit: number;
  profitAfterPayroll: number;
  invoiceCount: number;
  expenseCount: number;
  expenses: Expense[];
};

const emptyFinancials: Financials = {
  month: localMonthKey(),
  netRevenue: 0,
  payrollPayable: 0,
  expenseTotal: 0,
  netProfit: 0,
  profitAfterPayroll: 0,
  invoiceCount: 0,
  expenseCount: 0,
  expenses: [],
};

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

function money(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString()}`;
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
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
  const [month, setMonth] = useState(localMonthKey());
  const [financials, setFinancials] = useState<Financials>(emptyFinancials);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [expense, setExpense] = useState({
    date: localDateKey(),
    category: "",
    vendor: "",
    amount: "",
    description: "",
  });

  const loadFinancials = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/financials?month=${month}`, { headers: { "x-role": "admin" } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load financials");
      setFinancials({ ...emptyFinancials, ...data, expenses: Array.isArray(data.expenses) ? data.expenses : [] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load financials");
    }
  }, [month]);

  useEffect(() => {
    loadFinancials();
  }, [loadFinancials]);

  useEffect(() => {
    const socket: Socket = io(API_URL, SOCKET_OPTIONS);
    socket.on("financials:update", loadFinancials);
    socket.on("expenses:update", loadFinancials);
    socket.on("invoices:update", loadFinancials);
    socket.on("payroll:update", loadFinancials);
    return () => {
      socket.disconnect();
    };
  }, [loadFinancials]);

  const financeBreakdown = useMemo(() => [
    { name: "Revenue", value: financials.netRevenue },
    { name: "Payroll", value: financials.payrollPayable },
    { name: "Expenses", value: financials.expenseTotal },
    { name: "Net Profit", value: financials.netProfit },
  ], [financials]);

  const openExpenseDialog = () => {
    setExpense({ date: localDateKey(), category: "", vendor: "", amount: "", description: "" });
    setShowExpenseDialog(true);
  };

  const saveExpense = async () => {
    try {
      const res = await fetch(`${API_URL}/api/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-role": "admin" },
        body: JSON.stringify({ ...expense, amount: Number(expense.amount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save expense");
      toast.success("Expense added");
      setShowExpenseDialog(false);
      await loadFinancials();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save expense");
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/expenses/${id}`, { method: "DELETE", headers: { "x-role": "admin" } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete expense");
      toast.success("Expense removed");
      await loadFinancials();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete expense");
    }
  };

  return (
    <div>
      <PageHeader
        title="Finance & Analytics"
        subtitle="Paid invoice revenue, payroll, expenses, and final profit in one live monthly view."
        eyebrow="Business"
        actions={<Button onClick={openExpenseDialog}><Plus className="mr-2 h-4 w-4" />Add Expense</Button>}
      />

      <div className="mb-6 flex max-w-xs items-center gap-2">
        <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Paid Revenue" value={money(financials.netRevenue)} icon={<DollarSign />} subtitle={`${financials.invoiceCount} paid invoices`} variant="success" />
        <StatCard title="Payroll Cost" value={money(financials.payrollPayable)} icon={<Wallet />} subtitle="salary + commission" />
        <StatCard title="Expenses" value={money(financials.expenseTotal)} icon={<ReceiptText />} subtitle={`${financials.expenseCount} entries`} variant="warning" />
        <StatCard
          title="Final Profit"
          value={money(financials.netProfit)}
          icon={<TrendingUp />}
          trend={{ value: financials.netProfit >= 0 ? "Positive" : "Loss", positive: financials.netProfit >= 0 }}
          variant={financials.netProfit >= 0 ? "success" : "danger"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)] mb-6">
        <ChartCard title="Finance Breakdown" eyebrow={month}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={financeBreakdown} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="0" stroke="hsl(35 22% 88%)" vertical={false} />
              <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => money(Number(value))} cursor={{ fill: "hsl(35 22% 88% / 0.5)", radius: 4 }} />
              <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border p-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-muted-foreground">Operations</p>
              <h3 className="font-editorial text-xl text-foreground">Expense Ledger</h3>
            </div>
            <Button size="sm" variant="outline" onClick={openExpenseDialog}><Plus className="mr-2 h-4 w-4" />Add</Button>
          </div>
          <DataTable
            columns={[
              { key: "date", label: "Date", render: (row) => formatDate(row.date as string) },
              { key: "category", label: "Category", render: (row) => <span className="font-medium">{row.category as string}</span> },
              { key: "amount", label: "Amount", render: (row) => <span className="font-semibold text-destructive">{money(row.amount as number)}</span> },
              {
                key: "actions",
                label: "",
                render: (row) => (
                  <button onClick={() => deleteExpense(row.id as string)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                ),
              },
            ]}
            data={financials.expenses as unknown as Record<string, unknown>[]}
            emptyMessage="No expenses added for this month"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Daily Sales" eyebrow="This Week">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dailySales} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="0" stroke="hsl(35 22% 88%)" vertical={false} />
              <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `${Number(v) / 1000}k`} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(35 22% 88% / 0.5)", radius: 4 }} />
              <Bar dataKey="sales" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
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
              <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `${Number(v) / 1000}k`} />
              <YAxis type="category" dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} width={60} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="revenue" fill="hsl(var(--chart-2))" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>Record product purchases, service fees, rent, utilities, or any miscellaneous business cost.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Input type="date" value={expense.date} onChange={(event) => setExpense({ ...expense, date: event.target.value })} />
            <Input placeholder="Category, e.g. Product purchase" value={expense.category} onChange={(event) => setExpense({ ...expense, category: event.target.value })} />
            <Input placeholder="Vendor or paid to (optional)" value={expense.vendor} onChange={(event) => setExpense({ ...expense, vendor: event.target.value })} />
            <Input type="number" min="0" placeholder="Amount" value={expense.amount} onChange={(event) => setExpense({ ...expense, amount: event.target.value })} />
            <Input placeholder="Description (optional)" value={expense.description} onChange={(event) => setExpense({ ...expense, description: event.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowExpenseDialog(false)}>Cancel</Button>
            <Button onClick={saveExpense}>Save Expense</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
