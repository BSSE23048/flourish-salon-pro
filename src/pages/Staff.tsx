import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Power, Trash2, Trophy } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";

type StaffAvailability = "online" | "offline_today" | "on_leave";
type StaffMember = {
  id: string;
  name: string;
  title: string;
  specialties: string[];
  commissionRate: number;
  baseSalary: number;
  status: StaffAvailability;
  bio: string;
  monthlyRevenue: number;
  monthlyCommission: number;
  monthlyPayable: number;
  attendancePercentage: number;
};

const emptyForm = {
  name: "",
  title: "",
  specialties: "Hair",
  commissionRate: "10",
  baseSalary: "0",
  status: "online" as StaffAvailability,
  bio: "",
  pin: "",
};

const availabilityOptions: { value: StaffAvailability; label: string }[] = [
  { value: "online", label: "Online" },
  { value: "offline_today", label: "Offline" },
  { value: "on_leave", label: "Leave" },
];

function statusBadge(status: StaffAvailability) {
  const className =
    status === "online"
      ? "bg-success/10 text-success hover:bg-success/10"
      : status === "offline_today"
        ? "bg-warning/10 text-warning hover:bg-warning/10"
        : "bg-muted text-muted-foreground hover:bg-muted";

  return <Badge className={className}>{status.replace("_", " ")}</Badge>;
}

export default function Staff() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [deletePin, setDeletePin] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const loadStaff = useCallback(async () => {
    try {
      setLoadError(null);
      const res = await fetch(`${API_URL}/api/staff?includeUnavailable=true&month=${month}`, { headers: { "x-role": "admin" } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load staff");
      setStaffList(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load staff";
      setLoadError(`${message}. Make sure the API server is running on ${API_URL}.`);
      setStaffList([]);
      throw error;
    }
  }, [month]);

  useEffect(() => {
    loadStaff().catch(() => toast.error("Could not load staff"));
  }, [loadStaff]);

  const leaderboard = useMemo(
    () => [...staffList].sort((a, b) => b.monthlyCommission - a.monthlyCommission).slice(0, 3),
    [staffList]
  );

  const openForm = (staff?: StaffMember) => {
    setEditing(staff || null);
    setForm(staff ? {
      name: staff.name,
      title: staff.title,
      specialties: staff.specialties.join(", "),
      commissionRate: String(staff.commissionRate),
      baseSalary: String(staff.baseSalary || 0),
      status: staff.status,
      bio: staff.bio || "",
      pin: "",
    } : emptyForm);
    setFormOpen(true);
  };

  const saveStaff = async () => {
    setLoading(true);
    try {
      const method = editing ? "PATCH" : "POST";
      const url = editing ? `${API_URL}/api/staff/${editing.id}` : `${API_URL}/api/staff`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "x-role": "admin", "x-pin": form.pin },
        body: JSON.stringify({ ...form, commissionRate: Number(form.commissionRate), baseSalary: Number(form.baseSalary), pin: form.pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save staff");
      toast.success(editing ? "Staff updated" : "Staff added");
      setEditing(null);
      setForm(emptyForm);
      setFormOpen(false);
      await loadStaff();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save staff");
    } finally {
      setLoading(false);
    }
  };

  const deleteStaff = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/staff/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "x-role": "admin", "x-pin": deletePin },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete staff");
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
      setDeletePin("");
      await loadStaff();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete staff");
    } finally {
      setLoading(false);
    }
  };

  const updateAvailability = async (staffId: string, status: StaffAvailability) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/staff/${staffId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-role": "admin" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update staff status");
      toast.success(`${data.name} marked ${status.replace("_", " ")}`);
      await loadStaff();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Staff Management"
        subtitle="Team profiles, salary, attendance, commission, and availability"
        actions={<Button onClick={() => openForm()}><Plus className="mr-2 h-4 w-4" />Add Staff</Button>}
      />

      <div className="mb-6 flex max-w-xs items-center gap-2">
        <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {leaderboard.map((staff, index) => (
          <div key={staff.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-card">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${index === 0 ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>
              {index === 0 ? <Trophy className="h-5 w-5" /> : `#${index + 1}`}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{staff.name}</p>
              <p className="text-xs text-muted-foreground">Rs. {staff.monthlyCommission.toLocaleString()} commission</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card">
        <DataTable
          columns={[
            { key: "name", label: "Name", render: (row) => <span className="font-medium">{row.name}</span> },
            { key: "title", label: "Role" },
            { key: "specialties", label: "Specialties", render: (row) => row.specialties.join(", ") },
            { key: "baseSalary", label: "Salary", render: (row) => `Rs. ${Number(row.baseSalary || 0).toLocaleString()}` },
            { key: "commissionRate", label: "Rate", render: (row) => `${row.commissionRate}%` },
            { key: "monthlyRevenue", label: "Revenue", render: (row) => `Rs. ${Number(row.monthlyRevenue).toLocaleString()}` },
            { key: "monthlyCommission", label: "Commission", render: (row) => <span className="font-semibold">Rs. {Number(row.monthlyCommission).toLocaleString()}</span> },
            { key: "monthlyPayable", label: "Payable", render: (row) => <span className="font-semibold">Rs. {Number(row.monthlyPayable || 0).toLocaleString()}</span> },
            { key: "attendancePercentage", label: "Attendance", render: (row) => `${row.attendancePercentage}%` },
            { key: "status", label: "Status", render: (row) => statusBadge(row.status) },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  {availabilityOptions.map((option) => (
                    <Button key={option.value} size="sm" variant={row.status === option.value ? "default" : "outline"} disabled={loading} onClick={() => updateAvailability(row.id, option.value)}>
                      <Power className="mr-1 h-3.5 w-3.5" />{option.label}
                    </Button>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => openForm(row)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => setDeleteTarget(row)}><Trash2 className="mr-1 h-3.5 w-3.5" />Delete</Button>
                </div>
              ),
            },
          ]}
          data={staffList}
          emptyMessage={loadError || "No staff found"}
        />
      </div>

      <Dialog open={formOpen} onOpenChange={(open) => {
        setFormOpen(open);
        if (!open) {
          setEditing(null);
          setForm(emptyForm);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Staff" : "Add Staff"}</DialogTitle>
            <DialogDescription>Enter staff profile, salary, commission, and the security PIN.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Role / title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="Specialties, comma separated" value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} />
            <Input type="number" placeholder="Commission %" value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: e.target.value })} />
            <Input type="number" placeholder="Monthly salary (Rs.)" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} />
            <Textarea placeholder="Bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            <Input type="password" placeholder="Security PIN" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button disabled={loading} onClick={saveStaff}>{editing ? "Save Changes" : "Add Staff"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Staff</DialogTitle>
            <DialogDescription>Confirm staff deletion with the security PIN.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Enter PIN 1234 to delete {deleteTarget?.name}. Existing linked attendance and appointments for this staff member will be removed from the demo data.</p>
          <Input type="password" placeholder="Security PIN" value={deletePin} onChange={(e) => setDeletePin(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button disabled={loading} onClick={deleteStaff}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
