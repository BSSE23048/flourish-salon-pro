import { useState } from "react";
import { Plus, Search, Filter } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import DataTable, { StatusBadge, AppointmentStatus } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const appointments = [
  { id: 1, date: "2026-02-26", time: "10:00 AM", customer: "Ayesha Khan", phone: "0300-1234567", service: "Haircut & Blowdry", staff: "Sara", status: "Booked" as AppointmentStatus },
  { id: 2, date: "2026-02-26", time: "11:30 AM", customer: "Fatima Ali", phone: "0321-7654321", service: "Facial Treatment", staff: "Nadia", status: "Completed" as AppointmentStatus },
  { id: 3, date: "2026-02-26", time: "1:00 PM", customer: "Zainab Raza", phone: "0333-1112233", service: "Manicure & Pedicure", staff: "Hina", status: "Booked" as AppointmentStatus },
  { id: 4, date: "2026-02-25", time: "2:30 PM", customer: "Mehak Tariq", phone: "0345-9998887", service: "Hair Color", staff: "Sara", status: "Completed" as AppointmentStatus },
  { id: 5, date: "2026-02-25", time: "4:00 PM", customer: "Sana Malik", phone: "0312-5556667", service: "Bridal Makeup", staff: "Nadia", status: "Cancelled" as AppointmentStatus },
  { id: 6, date: "2026-02-24", time: "10:00 AM", customer: "Rabia Noor", phone: "0300-4445556", service: "Threading", staff: "Hina", status: "Completed" as AppointmentStatus },
  { id: 7, date: "2026-02-24", time: "3:00 PM", customer: "Nida Shah", phone: "0321-8889990", service: "Hair Spa", staff: "Sara", status: "Completed" as AppointmentStatus },
];

export default function Appointments() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const filtered = appointments.filter((a) => {
    const matchesSearch =
      a.customer.toLowerCase().includes(search.toLowerCase()) ||
      a.phone.includes(search);
    const matchesStatus = statusFilter === "All" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <PageHeader
        title="Appointments"
        subtitle="Manage all bookings and scheduling"
        actions={
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Appointment
          </Button>
        }
      />

      <div className="bg-card rounded-xl border border-border shadow-card">
        {/* Filters */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {["All", "Booked", "Completed", "Cancelled"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <DataTable
          columns={[
            { key: "date", label: "Date" },
            { key: "time", label: "Time" },
            { key: "customer", label: "Customer" },
            { key: "phone", label: "Phone" },
            { key: "service", label: "Service" },
            { key: "staff", label: "Staff" },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
          ]}
          data={filtered}
          emptyMessage="No appointments found"
        />
      </div>
    </div>
  );
}
