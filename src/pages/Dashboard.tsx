import { useState } from "react";
import {
  Calendar, DollarSign, Users, TrendingUp, Plus, Clock,
} from "lucide-react";
import StatCard from "@/components/StatCard";
import PageHeader from "@/components/PageHeader";
import DataTable, { StatusBadge, AppointmentStatus } from "@/components/DataTable";
import FormDialog from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";

const revenueData = [
  { month: "Jan", revenue: 42000 }, { month: "Feb", revenue: 38000 },
  { month: "Mar", revenue: 51000 }, { month: "Apr", revenue: 47000 },
  { month: "May", revenue: 53000 }, { month: "Jun", revenue: 59000 },
  { month: "Jul", revenue: 62000 },
];

const recentActivity = [
  { text: "New appointment booked by Ayesha Khan", time: "2 min ago", type: "booking" },
  { text: "Invoice #1042 generated — Rs. 3,500", time: "15 min ago", type: "billing" },
  { text: "Staff member Hina completed Manicure", time: "1 hour ago", type: "service" },
  { text: "New customer registered: Mehak Tariq", time: "2 hours ago", type: "customer" },
  { text: "Low stock alert: Hair Serum (3 left)", time: "3 hours ago", type: "alert" },
];

const activityDot: Record<string, string> = {
  booking:  "bg-primary",
  billing:  "bg-warning",
  service:  "bg-success",
  customer: "bg-chart-2",
  alert:    "bg-destructive",
};

const initialAppointments = [
  { time: "10:00 AM", customer: "Ayesha Khan", service: "Haircut & Blowdry", staff: "Sara", status: "Booked" as AppointmentStatus },
  { time: "11:30 AM", customer: "Fatima Ali", service: "Facial Treatment", staff: "Nadia", status: "Completed" as AppointmentStatus },
  { time: "1:00 PM", customer: "Zainab Raza", service: "Manicure & Pedicure", staff: "Hina", status: "Booked" as AppointmentStatus },
  { time: "2:30 PM", customer: "Mehak Tariq", service: "Hair Color", staff: "Sara", status: "Booked" as AppointmentStatus },
  { time: "4:00 PM", customer: "Sana Malik", service: "Bridal Makeup", staff: "Nadia", status: "Cancelled" as AppointmentStatus },
];

const chartTooltipStyle = {
  background: "hsl(40 30% 99%)",
  border: "1px solid hsl(35 22% 88%)",
  borderRadius: "12px",
  fontSize: "12px",
  boxShadow: "0 4px 12px hsl(25 20% 12% / 0.08)",
  padding: "10px 14px",
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const [showAdd, setShowAdd] = useState(false);
  const [appointments, setAppointments] = useState(initialAppointments);
  const { profile } = useAuth();

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Header with greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] font-medium text-muted-foreground mb-2">
            {today}
          </p>
          <h1 className="font-editorial text-4xl text-foreground tracking-tight">
            {getGreeting()}, {firstName}.
          </h1>
          <p className="text-base text-muted-foreground mt-1.5">
            Here&apos;s what&apos;s happening at Flourish today.
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} size="lg">
          <Plus className="w-4 h-4" />
          New Appointment
        </Button>
      </div>

      <FormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title="Book Appointment"
        description="Schedule a new appointment for a client."
        fields={[
          { key: "customer", label: "Customer Name", required: true, placeholder: "e.g. Ayesha Khan" },
          { key: "service", label: "Service", type: "select", options: ["Haircut & Blowdry", "Facial Treatment", "Manicure & Pedicure", "Hair Color", "Bridal Makeup", "Hair Spa", "Threading"], required: true },
          { key: "staff", label: "Staff Member", type: "select", options: ["Sara", "Nadia", "Hina", "Amina", "Rukhsar"], required: true },
          { key: "time", label: "Appointment Time", type: "time", required: true },
        ]}
        onSubmit={(data) => {
          const timeStr = data.time
            ? new Date(`2000-01-01T${data.time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
            : "";
          setAppointments([...appointments, { customer: data.customer, service: data.service, staff: data.staff, time: timeStr, status: "Booked" as AppointmentStatus }]);
          toast.success("Appointment booked successfully!");
        }}
        submitLabel="Book Appointment"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 stagger-children">
        <StatCard
          title="Today's Appointments"
          value={appointments.length}
          icon={<Calendar />}
          trend={{ value: "12% vs yesterday", positive: true }}
          variant="default"
          className="animate-fade-up"
        />
        <StatCard
          title="Today's Revenue"
          value="Rs. 18,500"
          icon={<DollarSign />}
          trend={{ value: "8% vs yesterday", positive: true }}
          variant="success"
          className="animate-fade-up"
        />
        <StatCard
          title="Total Customers"
          value="1,248"
          icon={<Users />}
          subtitle="23 new this week"
          variant="sage"
          className="animate-fade-up"
        />
        <StatCard
          title="Monthly Revenue"
          value="Rs. 4.2L"
          icon={<TrendingUp />}
          trend={{ value: "15% vs last month", positive: true }}
          variant="warning"
          className="animate-fade-up"
        />
      </div>

      {/* Charts + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-card rounded-[24px] border border-border p-6 shadow-card">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-muted-foreground mb-1">Performance</p>
              <h3 className="font-editorial text-2xl text-foreground tracking-tight">Monthly Revenue</h3>
            </div>
            <span className="text-sm font-medium text-success bg-success/10 border border-success/20 px-3 py-1 rounded-full">
              ↑ 15% growth
            </span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="0" stroke="hsl(35 22% 88%)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "hsl(25 15% 48%)", fontFamily: "Faculty Glyphic" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(25 15% 48%)", fontFamily: "Faculty Glyphic" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v / 1000}k`}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                cursor={{ fill: "hsl(35 22% 88% / 0.5)", radius: 4 }}
              />
              <Bar dataKey="revenue" fill="hsl(152 28% 22%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent activity */}
        <div className="bg-card rounded-[24px] border border-border p-6 shadow-card">
          <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-muted-foreground mb-1">Live Updates</p>
          <h3 className="font-editorial text-2xl text-foreground tracking-tight mb-6">Activity</h3>
          <div className="space-y-5">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="mt-1.5 flex-shrink-0">
                  <div className={`w-2 h-2 rounded-full ${activityDot[item.type]}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-foreground leading-snug">{item.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Today's appointments table */}
      <div className="bg-card rounded-[24px] border border-border shadow-card overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground stroke-[1.5]" />
          <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-muted-foreground">Schedule</p>
          <h3 className="font-editorial text-xl text-foreground ml-1">Today&apos;s Appointments</h3>
          <span className="ml-auto text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            {appointments.length} total
          </span>
        </div>
        <DataTable
          columns={[
            { key: "time", label: "Time" },
            { key: "customer", label: "Customer", render: (row) => <span className="font-medium">{row.customer as string}</span> },
            { key: "service", label: "Service" },
            { key: "staff", label: "Staff" },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status as AppointmentStatus} /> },
          ]}
          data={appointments}
        />
      </div>
    </div>
  );
}
