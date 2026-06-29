import { useEffect, useMemo, useState } from "react";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { io, Socket } from "socket.io-client";
import PageHeader from "@/components/PageHeader";
import DataTable, { StatusBadge, AppointmentStatus } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_URL, SOCKET_OPTIONS } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  booked: "Booked", arrived: "Booked", in_progress: "Booked",
  completed: "Completed", cancelled: "Cancelled", no_show: "Cancelled",
};

const STATUS_FILTERS = ["All", "Booked", "Completed", "Cancelled"] as const;

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    customerName: "", customerEmail: "",
    serviceId: "", staffId: "",
    date: new Date().toISOString().slice(0, 10), time: "10:00",
  });

  const serviceMap = useMemo(() => Object.fromEntries(services.map((s) => [s.id, s])), [services]);
  const staffMap   = useMemo(() => Object.fromEntries(staff.map((m) => [m.id, m])), [staff]);

  const loadData = async () => {
    const [ar, sr, str] = await Promise.all([
      fetch(`${API_URL}/api/appointments`, { headers: { "x-role": "admin" } }),
      fetch(`${API_URL}/api/services`,     { headers: { "x-role": "admin" } }),
      fetch(`${API_URL}/api/staff?includeUnavailable=true`, { headers: { "x-role": "admin" } }),
    ]);
    const [ad, sd, std] = await Promise.all([ar.json(), sr.json(), str.json()]);
    setAppointments(ad);
    setServices(sd);
    setStaff(std);
    setForm((f) => ({ ...f, serviceId: f.serviceId || sd[0]?.id || "", staffId: f.staffId || std[0]?.id || "" }));
  };

  useEffect(() => { loadData().catch(() => toast.error("Could not load appointments")); }, []);

  useEffect(() => {
    const socket: Socket = io(API_URL, SOCKET_OPTIONS);
    socket.on("appointments:update", setAppointments);
    socket.on("staff:update", loadData);
    return () => { socket.disconnect(); };
  }, []);

  const rows = appointments.map((a) => ({
    ...a,
    date: a.startAt.slice(0, 10),
    time: new Date(a.startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    customer: a.customerName,
    service: serviceMap[a.serviceId]?.name || a.serviceId,
    staffName: staffMap[a.staffId]?.name || a.staffId,
    displayStatus: statusMap[a.status] || "Booked",
  }));

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = r.customer.toLowerCase().includes(q) || r.customerEmail.toLowerCase().includes(q);
    const matchStatus = statusFilter === "All" || r.displayStatus === statusFilter;
    return matchSearch && matchStatus;
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
        subtitle="Live scheduling connected to staff, services, and availability."
        eyebrow="Operations"
        actions={<Button onClick={() => setShowAdd(true)}><Plus />New Appointment</Button>}
      />

      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground stroke-[1.5]" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11"
            />
          </div>

          {/* Status filter pills */}
          <div className="flex items-center gap-1 bg-muted rounded-full p-1 flex-shrink-0">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-150",
                  statusFilter === s
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {filtered.length} results
          </div>
        </div>

        <DataTable
          columns={[
            { key: "date", label: "Date" },
            { key: "time", label: "Time" },
            { key: "customer", label: "Customer", render: (row) => <span className="font-medium">{row.customer as string}</span> },
            { key: "customerEmail", label: "Email", render: (row) => <span className="text-muted-foreground">{row.customerEmail as string}</span> },
            { key: "service", label: "Service" },
            { key: "staffName", label: "Staff" },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={row.displayStatus as AppointmentStatus} /> },
          ]}
          data={filtered}
          emptyMessage="No appointments found"
        />
      </div>

      {/* New Appointment Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer Name</label>
              <Input placeholder="Full name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer Email</label>
              <Input type="email" placeholder="email@example.com" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Service</label>
              <Select value={form.serviceId} onValueChange={(v) => setForm({ ...form, serviceId: v })}>
                <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Staff Member</label>
              <Select value={form.staffId} onValueChange={(v) => setForm({ ...form, staffId: v })}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>{staff.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Time</label>
                <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={createAppointment}>Book Appointment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
