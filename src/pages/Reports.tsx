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
import { CalendarDays, DollarSign, Plus, Printer, ReceiptText, Trash2, TrendingUp } from "lucide-react";
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

type Appointment = {
  id: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  staffId: string;
  serviceId: string;
  startAt: string;
  endAt?: string;
  status: string;
};

type Service = { id: string; name: string; price: number };
type Staff = { id: string; name: string };
type InvoiceItem = { serviceId: string; name: string; staffId: string; quantity: number; unitPrice: number; total: number };
type Invoice = {
  id: string;
  date: string;
  customer: string;
  customerEmail?: string;
  customerPhone?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  payment: string;
  status: string;
  createdAt?: string;
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

const pieColors = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))",
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

function shortDay(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });
}

function buildDailySales(invoices: Invoice[], month: string) {
  const paid = invoices.filter((invoice) => invoice.status === "Paid" && String(invoice.date).startsWith(month));
  const days = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  return Array.from({ length: days }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, "0")}`;
    const sales = paid.filter((invoice) => invoice.date === date).reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
    return { day: `${shortDay(date)} ${index + 1}`, sales };
  }).filter((row) => row.sales > 0);
}

function buildPopularServices(invoices: Invoice[], services: Service[], month: string) {
  const serviceMap = Object.fromEntries(services.map((service) => [service.id, service.name]));
  const totals = new Map<string, number>();
  invoices
    .filter((invoice) => invoice.status === "Paid" && String(invoice.date).startsWith(month))
    .flatMap((invoice) => invoice.items || [])
    .forEach((item) => {
      const name = serviceMap[item.serviceId] || item.name || "Other service";
      totals.set(name, (totals.get(name) || 0) + Number(item.quantity || 1));
    });
  return Array.from(totals.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
}

function buildPeakHours(appointments: Appointment[], month: string) {
  const totals = new Map<string, number>();
  appointments
    .filter((appointment) => localDateKey(new Date(appointment.startAt)).startsWith(month))
    .forEach((appointment) => {
      const date = new Date(appointment.startAt);
      const hour = date.toLocaleTimeString("en-US", { hour: "numeric" });
      totals.set(hour, (totals.get(hour) || 0) + 1);
    });
  return Array.from(totals.entries()).map(([hour, appointments]) => ({ hour, appointments }));
}

function buildStaffRevenue(invoices: Invoice[], staff: Staff[], month: string) {
  const names = Object.fromEntries(staff.map((member) => [member.id, member.name]));
  const totals = new Map<string, number>();
  invoices
    .filter((invoice) => invoice.status === "Paid" && String(invoice.date).startsWith(month))
    .flatMap((invoice) => invoice.items || [])
    .forEach((item) => {
      const name = names[item.staffId] || item.staffId || "Unassigned";
      totals.set(name, (totals.get(name) || 0) + Number(item.total || 0));
    });
  return Array.from(totals.entries()).map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue);
}

function printInvoice(invoice: Invoice) {
  const rows = (invoice.items || []).map((item) => `
    <tr>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>${money(item.unitPrice)}</td>
      <td>${money(item.total)}</td>
    </tr>
  `).join("");
  const discountRow = invoice.discount > 0 ? `<tr><td colspan="3">Discount</td><td>-${money(invoice.discount)}</td></tr>` : "";
  const popup = window.open("", "_blank", "width=420,height=700");
  if (!popup) return;
  popup.document.write(`
    <html>
      <head>
        <title>${invoice.id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a18; }
          h1 { font-size: 20px; margin: 0; }
          p { margin: 4px 0; font-size: 12px; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12px; }
          th, td { border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: left; }
          td:last-child, th:last-child { text-align: right; }
          .total { font-size: 18px; font-weight: 700; text-align: right; margin-top: 16px; }
        </style>
      </head>
      <body>
        <h1>Flourish Salon Pro</h1>
        <p>Invoice ${invoice.id}</p>
        <p>Date: ${invoice.date}</p>
        <p>Customer: ${invoice.customer}</p>
        <table>
          <thead><tr><th>Service</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead>
          <tbody>${rows}${discountRow}</tbody>
        </table>
        <div class="total">Total: ${money(invoice.total)}</div>
        <p>Payment: ${invoice.payment} | Status: ${invoice.status}</p>
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
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
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
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
      const [financialRes, appointmentRes, serviceRes, staffRes, invoiceRes] = await Promise.all([
        fetch(`${API_URL}/api/financials?month=${month}`, { headers: { "x-role": "admin" } }),
        fetch(`${API_URL}/api/appointments`, { headers: { "x-role": "admin" } }),
        fetch(`${API_URL}/api/services`, { headers: { "x-role": "admin" } }),
        fetch(`${API_URL}/api/staff?includeUnavailable=true`, { headers: { "x-role": "admin" } }),
        fetch(`${API_URL}/api/invoices`, { headers: { "x-role": "admin" } }),
      ]);
      if (![financialRes, appointmentRes, serviceRes, staffRes, invoiceRes].every((res) => res.ok)) {
        throw new Error("Could not load live report data");
      }
      const [financialData, appointmentData, serviceData, staffData, invoiceData] = await Promise.all([
        financialRes.json(),
        appointmentRes.json(),
        serviceRes.json(),
        staffRes.json(),
        invoiceRes.json(),
      ]);
      setFinancials({ ...emptyFinancials, ...financialData, expenses: Array.isArray(financialData.expenses) ? financialData.expenses : [] });
      setAppointments(Array.isArray(appointmentData) ? appointmentData : []);
      setServices(Array.isArray(serviceData) ? serviceData : []);
      setStaff(Array.isArray(staffData) ? staffData : []);
      setInvoices(Array.isArray(invoiceData) ? invoiceData : []);
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
    socket.on("appointments:update", loadFinancials);
    socket.on("staff:update", loadFinancials);
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
  const dailySales = useMemo(() => buildDailySales(invoices, month), [invoices, month]);
  const popularServices = useMemo(() => buildPopularServices(invoices, services, month), [invoices, month, services]);
  const peakHours = useMemo(() => buildPeakHours(appointments, month), [appointments, month]);
  const staffRevenue = useMemo(() => buildStaffRevenue(invoices, staff, month), [invoices, month, staff]);
  const paidInvoices = useMemo(() =>
    invoices.filter((invoice) => invoice.status === "Paid" && String(invoice.date).startsWith(month)),
  [invoices, month]);

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
        <StatCard title="Bookings" value={appointments.filter((appointment) => localDateKey(new Date(appointment.startAt)).startsWith(month)).length} icon={<CalendarDays />} subtitle="scheduled this month" />
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

      <div className="mt-6 rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-muted-foreground">Bills</p>
            <h3 className="font-editorial text-xl text-foreground">Paid Invoice Ledger</h3>
          </div>
          <p className="text-xs text-muted-foreground">{paidInvoices.length} invoices</p>
        </div>
        <DataTable
          columns={[
            { key: "id", label: "Invoice", render: (row) => <span className="font-mono text-xs font-semibold">{row.id as string}</span> },
            { key: "date", label: "Date", render: (row) => formatDate(row.date as string) },
            { key: "customer", label: "Customer", render: (row) => <span className="font-medium">{row.customer as string}</span> },
            { key: "items", label: "Services", render: (row) => (row.items as InvoiceItem[]).map((item) => `${item.name} x${item.quantity}`).join(", ") },
            { key: "payment", label: "Payment" },
            { key: "total", label: "Total", render: (row) => <span className="font-semibold">{money(row.total as number)}</span> },
            {
              key: "actions",
              label: "",
              render: (row) => (
                <Button size="sm" variant="outline" onClick={() => printInvoice(row as unknown as Invoice)}>
                  <Printer className="mr-2 h-3.5 w-3.5" />Print Bill
                </Button>
              ),
            },
          ]}
          data={paidInvoices as unknown as Record<string, unknown>[]}
          emptyMessage="No paid invoices for this month"
        />
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
