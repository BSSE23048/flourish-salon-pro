import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { io, Socket } from "socket.io-client";
import PageHeader from "@/components/PageHeader";
import DataTable, { StatusBadge, AppointmentStatus } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_URL, SOCKET_OPTIONS } from "@/lib/api";
import { toast } from "sonner";

type Service = { id: string; name: string; durationMinutes: number };
type Staff = { id: string; name: string };
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

const statusMap: Record<string, AppointmentStatus> = {
  booked: "Booked",
  arrived: "Booked",
  in_progress: "Booked",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "Cancelled",
};

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ customerName: "", customerEmail: "", serviceId: "", staffId: "", date: new Date().toISOString().slice(0, 10), time: "10:00" });

  const serviceMap = useMemo(() => Object.fromEntries(services.map((service) => [service.id, service])), [services]);
  const staffMap = useMemo(() => Object.fromEntries(staff.map((member) => [member.id, member])), [staff]);

  const loadData = async () => {
    const [appointmentRes, serviceRes, staffRes] = await Promise.all([
      fetch(`${API_URL}/api/appointments`, { headers: { "x-role": "admin" } }),
      fetch(`${API_URL}/api/services`, { headers: { "x-role": "admin" } }),
      fetch(`${API_URL}/api/staff?includeUnavailable=true`, { headers: { "x-role": "admin" } }),
    ]);
    const [appointmentData, serviceData, staffData] = await Promise.all([appointmentRes.json(), serviceRes.json(), staffRes.json()]);
    setAppointments(appointmentData);
    setServices(serviceData);
    setStaff(staffData);
    setForm((current) => ({
      ...current,
      serviceId: current.serviceId || serviceData[0]?.id || "",
      staffId: current.staffId || staffData[0]?.id || "",
    }));
  };

  useEffect(() => {
    loadData().catch(() => toast.error("Could not load appointments"));
  }, []);

  useEffect(() => {
    const socket: Socket = io(API_URL, SOCKET_OPTIONS);
    socket.on("appointments:update", setAppointments);
    socket.on("staff:update", loadData);
    return () => {
      socket.disconnect();
    };
  }, []);

  const rows = appointments.map((appointment) => ({
    ...appointment,
    date: appointment.startAt.slice(0, 10),
    time: new Date(appointment.startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    customer: appointment.customerName,
    service: serviceMap[appointment.serviceId]?.name || appointment.serviceId,
    staff: staffMap[appointment.staffId]?.name || appointment.staffId,
    displayStatus: statusMap[appointment.status] || "Booked",
  }));

  const filtered = rows.filter((appointment) => {
    const matchesSearch = appointment.customer.toLowerCase().includes(search.toLowerCase()) || appointment.customerEmail.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || appointment.displayStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const createAppointment = async () => {
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
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create appointment");
    }
  };

  return (
    <div>
      <PageHeader
        title="Appointments"
        subtitle="Live appointments connected to staff, services, and booking availability"
        actions={<Button onClick={() => setShowAdd(true)}><Plus className="mr-2 h-4 w-4" />New Appointment</Button>}
      />

      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-2">
            {["All", "Booked", "Completed", "Cancelled"].map((status) => (
              <button key={status} onClick={() => setStatusFilter(status)} className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${statusFilter === status ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{status}</button>
            ))}
          </div>
        </div>
        <DataTable
          columns={[
            { key: "date", label: "Date" },
            { key: "time", label: "Time" },
            { key: "customer", label: "Customer" },
            { key: "customerEmail", label: "Email" },
            { key: "service", label: "Service" },
            { key: "staff", label: "Staff" },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={row.displayStatus} /> },
          ]}
          data={filtered}
          emptyMessage="No appointments found"
        />
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Appointment</DialogTitle></DialogHeader>
          <div className="space-y-3">
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
            <div className="grid grid-cols-2 gap-3">
              <Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
              <Input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={createAppointment}>Book Appointment</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
