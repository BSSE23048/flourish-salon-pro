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

const revenueData = [
  { month: "Jan", revenue: 42000 }, { month: "Feb", revenue: 38000 },
  { month: "Mar", revenue: 51000 }, { month: "Apr", revenue: 47000 },
  { month: "May", revenue: 53000 }, { month: "Jun", revenue: 59000 },
  { month: "Jul", revenue: 62000 },
];

const recentActivity = [
  { text: "New appointment booked by Ayesha Khan", time: "2 min ago" },
  { text: "Invoice #1042 generated — Rs. 3,500", time: "15 min ago" },
  { text: "Staff member Hina completed Manicure", time: "1 hour ago" },
  { text: "New customer registered: Mehak Tariq", time: "2 hours ago" },
  { text: "Low stock alert: Hair Serum (3 left)", time: "3 hours ago" },
];

const initialAppointments = [
  { time: "10:00 AM", customer: "Ayesha Khan", service: "Haircut & Blowdry", staff: "Sara", status: "Booked" as AppointmentStatus },
  { time: "11:30 AM", customer: "Fatima Ali", service: "Facial Treatment", staff: "Nadia", status: "Completed" as AppointmentStatus },
  { time: "1:00 PM", customer: "Zainab Raza", service: "Manicure & Pedicure", staff: "Hina", status: "Booked" as AppointmentStatus },
  { time: "2:30 PM", customer: "Mehak Tariq", service: "Hair Color", staff: "Sara", status: "Booked" as AppointmentStatus },
  { time: "4:00 PM", customer: "Sana Malik", service: "Bridal Makeup", staff: "Nadia", status: "Cancelled" as AppointmentStatus },
];

export default function Dashboard() {
  const [showAdd, setShowAdd] = useState(false);
  const [appointments, setAppointments] = useState(initialAppointments);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Welcome back! Here's what's happening today."
        actions={
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Appointment
          </Button>
        }
      />

      <FormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title="Add Appointment"
        fields={[
          { key: "customer", label: "Customer Name", required: true, placeholder: "e.g. Ayesha Khan" },
          { key: "service", label: "Service", type: "select", options: ["Haircut & Blowdry", "Facial Treatment", "Manicure & Pedicure", "Hair Color", "Bridal Makeup", "Hair Spa", "Threading"], required: true },
          { key: "staff", label: "Staff", type: "select", options: ["Sara", "Nadia", "Hina", "Amina", "Rukhsar"], required: true },
          { key: "time", label: "Time", type: "time", required: true },
        ]}
        onSubmit={(data) => {
          const timeStr = data.time ? new Date(`2000-01-01T${data.time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : "";
          setAppointments([...appointments, { customer: data.customer, service: data.service, staff: data.staff, time: timeStr, status: "Booked" as AppointmentStatus }]);
          toast.success("Appointment added successfully!");
        }}
        submitLabel="Book Appointment"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Today's Appointments" value={appointments.length} icon={<Calendar className="w-5 h-5" />} trend={{ value: "12% vs yesterday", positive: true }} />
        <StatCard title="Today's Revenue" value="Rs. 18,500" icon={<DollarSign className="w-5 h-5" />} trend={{ value: "8% vs yesterday", positive: true }} />
        <StatCard title="Total Customers" value={1248} icon={<Users className="w-5 h-5" />} trend={{ value: "23 new this week", positive: true }} />
        <StatCard title="Monthly Revenue" value="Rs. 4.2L" icon={<TrendingUp className="w-5 h-5" />} trend={{ value: "15% vs last month", positive: true }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-1 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                <div>
                  <p className="text-sm text-foreground">{item.text}</p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-card rounded-xl border border-border shadow-card">
        <div className="p-5 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Today's Appointments
          </h3>
        </div>
        <DataTable
          columns={[
            { key: "time", label: "Time" },
            { key: "customer", label: "Customer" },
            { key: "service", label: "Service" },
            { key: "staff", label: "Staff" },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
          ]}
          data={appointments}
        />
      </div>
    </div>
  );
}
