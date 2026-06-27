import { useCallback, useEffect, useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Plus, Trash2, Trophy, Medal } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type StaffAvailability = "online" | "offline_today" | "on_leave";
type StaffMember = {
  id: string; name: string; title: string; specialties: string[];
  commissionRate: number; baseSalary: number; status: StaffAvailability;
  bio: string; monthlyRevenue: number; monthlyCommission: number;
  monthlyPayable: number; attendancePercentage: number;
};

const emptyForm = {
  name: "", title: "", specialties: "Hair", commissionRate: "10",
  baseSalary: "0", status: "online" as StaffAvailability, bio: "", pin: "",
};

const availabilityConfig: Record<StaffAvailability, { label: string; badge: string }> = {
  online:       { label: "Online",   badge: "success" },
  offline_today:{ label: "Offline",  badge: "warning" },
  on_leave:     { label: "On Leave", badge: "muted" },
};

function StaffAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-semibold text-primary">{initials}</span>
    </div>
  );
}

const RANK_ICONS = [
  <Trophy key={0} className="h-4 w-4 text-warning" />,
  <Medal key={1} className="h-4 w-4 text-muted-foreground" />,
  <Medal key={2} className="h-4 w-4 text-muted-foreground opacity-70" />,
];

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
    }
  }, [month]);

  useEffect(() => { loadStaff().catch(() => toast.error("Could not load staff")); }, [loadStaff]);

  const leaderboard = useMemo(
    () => [...staffList].sort((a, b) => b.monthlyCommission - a.monthlyCommission).slice(0, 3),
    [staffList]
  );

  const openForm = (staff?: StaffMember) => {
    setEditing(staff || null);
    setForm(staff ? {
      name: staff.name, title: staff.title,
      specialties: staff.specialties.join(", "),
      commissionRate: String(staff.commissionRate),
      baseSalary: String(staff.baseSalary || 0),
      status: staff.status, bio: staff.bio || "", pin: "",
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
      if (!res.ok) throw new Error(data.error || "Could not save");
      toast.success(editing ? "Staff updated" : "Staff member added");
      setEditing(null); setForm(emptyForm); setFormOpen(false);
      await loadStaff();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save staff");
    } finally { setLoading(false); }
  };

  const deleteStaff = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/staff/${deleteTarget.id}`, {
        method: "DELETE", headers: { "x-role": "admin", "x-pin": deletePin },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete");
      toast.success(`${deleteTarget.name} removed`);
      setDeleteTarget(null); setDeletePin("");
      await loadStaff();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete");
    } finally { setLoading(false); }
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
      if (!res.ok) throw new Error(data.error || "Update failed");
      toast.success(`${data.name} marked ${availabilityConfig[status].label}`);
      await loadStaff();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally { setLoading(false); }
  };

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle="Team profiles, salary, attendance, commission, and availability."
        eyebrow="Team"
        actions={
          <div className="flex items-center gap-3">
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40 h-9 text-sm" />
            <Button onClick={() => openForm()}>
              <Plus />Add Staff
            </Button>
          </div>
        }
      />

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
          {leaderboard.map((member, index) => (
            <div
              key={member.id}
              className={cn(
                "flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-card",
                "transition-all duration-250 hover:-translate-y-0.5 hover:shadow-lift",
                index === 0 && "border-warning/30 bg-warning/5"
              )}
            >
              <div className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full border flex-shrink-0",
                index === 0 ? "bg-warning/10 border-warning/20" : "bg-muted border-border"
              )}>
                {RANK_ICONS[index]}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.title}</p>
                <p className="font-editorial text-lg text-primary mt-0.5 leading-none">
                  Rs. {member.monthlyCommission.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Staff table */}
      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        <DataTable
          columns={[
            {
              key: "name", label: "Staff Member",
              render: (row) => (
                <div className="flex items-center gap-3">
                  <StaffAvatar name={row.name as string} />
                  <div>
                    <p className="font-medium leading-none">{row.name as string}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{row.title as string}</p>
                  </div>
                </div>
              ),
            },
            { key: "baseSalary",         label: "Salary",     render: (row) => `Rs. ${Number(row.baseSalary || 0).toLocaleString()}` },
            { key: "commissionRate",      label: "Rate",       render: (row) => `${row.commissionRate}%` },
            { key: "monthlyRevenue",      label: "Revenue",    render: (row) => `Rs. ${Number(row.monthlyRevenue).toLocaleString()}` },
            { key: "monthlyCommission",   label: "Commission", render: (row) => <span className="font-semibold text-primary">Rs. {Number(row.monthlyCommission).toLocaleString()}</span> },
            { key: "monthlyPayable",      label: "Payable",    render: (row) => <span className="font-semibold">Rs. {Number(row.monthlyPayable || 0).toLocaleString()}</span> },
            { key: "attendancePercentage",label: "Attendance", render: (row) => `${row.attendancePercentage}%` },
            {
              key: "status", label: "Status",
              render: (row) => {
                const config = availabilityConfig[row.status as StaffAvailability];
                return <Badge variant={config.badge as "success" | "warning" | "muted"}>{config.label}</Badge>;
              },
            },
            {
              key: "actions", label: "",
              render: (row) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => openForm(row as unknown as StaffMember)}>
                      <Pencil className="w-3.5 h-3.5 mr-2" /> Edit profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {(["online", "offline_today", "on_leave"] as StaffAvailability[]).map((s) => (
                      <DropdownMenuItem
                        key={s}
                        onClick={() => updateAvailability(row.id as string, s)}
                        disabled={loading || row.status === s}
                      >
                        Mark {availabilityConfig[s].label}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteTarget(row as unknown as StaffMember)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ),
            },
          ]}
          data={staffList}
          emptyMessage={loadError || "No staff found"}
        />
      </div>

      {/* Edit/Add Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) { setEditing(null); setForm(emptyForm); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role / Title</label>
                <Input placeholder="e.g. Senior Stylist" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Specialties</label>
              <Input placeholder="Hair, Nails, Makeup (comma separated)" value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Commission %</label>
                <Input type="number" placeholder="10" value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Monthly Salary (Rs.)</label>
                <Input type="number" placeholder="0" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bio</label>
              <Textarea placeholder="Brief bio or description…" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Security PIN</label>
              <Input type="password" placeholder="4-digit PIN" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button disabled={loading} onClick={saveStaff}>{editing ? "Save Changes" : "Add Staff"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Staff Member</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enter PIN <strong className="text-foreground">1234</strong> to permanently remove <strong className="text-foreground">{deleteTarget?.name}</strong>. This will also remove linked attendance and appointment records.
          </p>
          <Input type="password" placeholder="Security PIN" value={deletePin} onChange={(e) => setDeletePin(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={loading} onClick={deleteStaff}>Remove Staff</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
