import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, DollarSign, Plus, TrendingUp, Users } from "lucide-react";
import { io, Socket } from "socket.io-client";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import DataTable, { AppointmentStatus, StatusBadge } from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_UNAVAILABLE_MESSAGE, API_URL, SOCKET_OPTIONS } from "@/lib/api";
import { toast } from "sonner";

type Service = {
  id: string;
  name: string;
  price: number;
};

type Staff = {
  id: string;
  name: string;
};

type Appointment = {
  id: string;
  customerName: string;
  customerEmail: string;
  staffId: string;
  serviceId: string;
  startAt: string;
  endAt: string;
  status: string;
};

type Invoice = {
  id: string;
  date: string;
  customer: string;
  status: string;
  total: number;
  createdAt?: string;
};

type Metrics = {
  appointmentsToday: number;
  revenueToday: number;
  totalCustomers: number;
  lowStockCount: number;
};

type PayrollResponse = {
  summary?: {
    netRevenue: number;
    invoiceCount: number;
  };
};

const emptyMetrics: Metrics = {
  appointmentsToday: 0,
  revenueToday: 0,
  totalCustomers: 0,
  lowStockCount: 0,
};

const statusMap: Record<string, AppointmentStatus> = {
  booked: "Booked",
  arrived: "Booked",
  in_progress: "Booked",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "Cancelled",
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthValue() {
  return todayInputValue().slice(0, 7);
}

function money(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString()}`;
}

function displayTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function monthLabel(key: string) {
  return new Date(`${key}-01T00:00:00`).toLocaleDateString("en-US", { month: "short" });
}

function buildRevenueData(invoices: Invoice[]) {
  const start = new Date();
  start.setDate(1);
  start.setMonth(start.getMonth() - 5);

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(start);
    date.setMonth(start.getMonth() + index);
    const key = monthKey(date);
    const revenue = invoices
      .filter((invoice) => String(invoice.date).startsWith(key) && invoice.status === "Paid")
      .reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);

    return { month: monthLabel(key), revenue };
  });
}

export default function Dashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    serviceId: "",
    staffId: "",
    date: todayInputValue(),
    time: "",
  });

  const serviceMap = useMemo(() => Object.fromEntries(services.map((service) => [service.id, service])), [services]);
  const staffMap = useMemo(() => Object.fromEntries(staff.map((member) => [member.id, member])), [staff]);
  const revenueData = useMemo(() => buildRevenueData(invoices), [invoices]);

  const loadData = async () => {
    const month = currentMonthValue();
    const [appointmentRes, serviceRes, staffRes, metricsRes, invoiceRes, payrollRes] = await Promise.all([
      fetch(`${API_URL}/api/appointments`, { headers: { "x-role": "admin" } }),
      fetch(`${API_URL}/api/services`, { headers: { "x-role": "admin" } }),
      fetch(`${API_URL}/api/staff?includeUnavailable=true`, { headers: { "x-role": "admin" } }),
      fetch(`${API_URL}/api/metrics`, { headers: { "x-role": "admin" } }),
      fetch(`${API_URL}/api/invoices`, { headers: { "x-role": "admin" } }),
      fetch(`${API_URL}/api/payroll?month=${month}`, { headers: { "x-role": "admin" } }),
    ]);

    if (![appointmentRes, serviceRes, staffRes, metricsRes, invoiceRes, payrollRes].every((res) => res.ok)) {
      throw new Error("Could not load dashboard data");
    }

    const [appointmentData, serviceData, staffData, metricsData, invoiceData, payrollData] = await Promise.all([
      appointmentRes.json(),
      serviceRes.json(),
      staffRes.json(),
      metricsRes.json(),
      invoiceRes.json(),
      payrollRes.json() as Promise<PayrollResponse>,
    ]);

    setAppointments(appointmentData);
    setServices(serviceData);
    setStaff(staffData);
    setMetrics(metricsData);
    setInvoices(invoiceData);
    setMonthlyRevenue(payrollData.summary?.netRevenue || 0);
    setInvoiceCount(payrollData.summary?.invoiceCount || 0);
    setForm((current) => ({
      ...current,
      serviceId: current.serviceId || serviceData[0]?.id || "",
      staffId: current.staffId || staffData[0]?.id || "",
    }));
  };

  useEffect(() => {
    loadData().catch((error) => {
      toast.error(error instanceof TypeError ? API_UNAVAILABLE_MESSAGE : error instanceof Error ? error.message : "Could not load dashboard data");
    });
  }, []);

  useEffect(() => {
    const socket: Socket = io(API_URL, SOCKET_OPTIONS);
    socket.on("appointments:update", setAppointments);
    socket.on("invoices:update", (rows: Invoice[]) => {
      setInvoices(rows);
      loadData().catch(() => undefined);
    });
    socket.on("staff:update", () => loadData().catch(() => undefined));
    return () => {
      socket.disconnect();
    };
  }, []);

  const appointmentRows = useMemo(() => appointments
    .filter((appointment) => appointment.startAt.slice(0, 10) === todayInputValue())
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .map((appointment) => ({
      ...appointment,
      time: displayTime(appointment.startAt),
      customer: appointment.customerName,
      service: serviceMap[appointment.serviceId]?.name || appointment.serviceId,
      staff: staffMap[appointment.staffId]?.name || appointment.staffId,
      displayStatus: statusMap[appointment.status] || "Booked",
    })), [appointments, serviceMap, staffMap]);

  const recentActivity = useMemo(() => {
    const bookingActivity = appointments.map((appointment) => ({
      id: appointment.id,
      at: appointment.startAt,
      text: `${appointment.customerName} booked ${serviceMap[appointment.serviceId]?.name || appointment.serviceId}`,
    }));
    const invoiceActivity = invoices.map((invoice) => ({
      id: invoice.id,
      at: invoice.createdAt || invoice.date,
      text: `Invoice ${invoice.id} generated for ${money(invoice.total)}`,
    }));

    return [...bookingActivity, ...invoiceActivity]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 5);
  }, [appointments, invoices, serviceMap]);

  const createAppointment = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-role": "admin" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create appointment");
      toast.success(`Appointment booked for ${form.customerName}`);
      setShowAdd(false);
      setForm((current) => ({ ...current, customerName: "", customerEmail: "", date: todayInputValue(), time: "" }));
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create appointment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Live overview from appointments, invoices, staff, and customers."
        actions={
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Appointment
          </Button>
        }
      />

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-hidden sm:max-w-lg">
          <DialogHeader><DialogTitle>Add Appointment</DialogTitle></DialogHeader>
          <div className="max-h-[calc(90vh-8rem)] space-y-3 overflow-y-auto pr-1">
            <Input placeholder="Customer name" value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} />
            <Input type="email" placeholder="Customer email" value={form.customerEmail} onChange={(event) => setForm({ ...form, customerEmail: event.target.value })} />
            <Select value={form.serviceId} onValueChange={(value) => setForm({ ...form, serviceId: value })}>
              <SelectTrigger><SelectValue placeholder="Service" /></SelectTrigger>
              <SelectContent>{services.map((service) => <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.staffId} onValueChange={(value) => setForm({ ...form, staffId: value })}>
              <SelectTrigger><SelectValue placeholder="Staff" /></SelectTrigger>
              <SelectContent>{staff.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
              <Input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} />
            </div>
            <div className="sticky bottom-0 flex justify-end gap-2 bg-background/95 pb-1 pt-3 backdrop-blur">
              <Button variant="outline" onClick={() => setShowAdd(false)} disabled={saving}>Cancel</Button>
              <Button onClick={createAppointment} disabled={saving || !form.customerName || !form.serviceId || !form.staffId || !form.time}>
                Book Appointment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Today's Appointments" value={metrics.appointmentsToday} icon={<Calendar className="h-5 w-5" />} subtitle={`${appointmentRows.length} shown in schedule`} />
        <StatCard title="Today's Revenue" value={money(metrics.revenueToday)} icon={<DollarSign className="h-5 w-5" />} subtitle="Completed appointments" />
        <StatCard title="Total Customers" value={metrics.totalCustomers} icon={<Users className="h-5 w-5" />} subtitle={`${metrics.lowStockCount} inventory alerts`} />
        <StatCard title="Monthly Revenue" value={money(monthlyRevenue)} icon={<TrendingUp className="h-5 w-5" />} subtitle={`${invoiceCount} paid invoices`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Revenue From Paid Invoices</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(value) => money(Number(value))} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="text-sm text-foreground">{item.text}</p>
                  <p className="text-xs text-muted-foreground">{new Date(item.at).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && <p className="text-sm text-muted-foreground">No recent activity yet.</p>}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clock className="h-4 w-4" />
            Today's Appointments
          </h3>
        </div>
        <DataTable
          columns={[
            { key: "time", label: "Time" },
            { key: "customer", label: "Customer" },
            { key: "service", label: "Service" },
            { key: "staff", label: "Staff" },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={row.displayStatus} /> },
          ]}
          data={appointmentRows}
          emptyMessage="No appointments scheduled for today"
        />
      </div>
    </div>
  );
}
