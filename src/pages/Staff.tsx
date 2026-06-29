import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, KeyRound, Plus, RefreshCw, ShieldAlert, UserRound } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { API_UNAVAILABLE_MESSAGE, API_URL, getAuthHeaders } from "@/lib/api";
import { toast } from "sonner";

type StaffAvailability = "online" | "offline_today" | "on_leave";

type StaffMember = {
  id: string;
  firstName?: string;
  lastName?: string;
  name: string;
  email: string;
  title: string;
  specialties: string[];
  commissionRate: number;
  baseSalary: number;
  status: StaffAvailability;
  bio: string;
  mustResetPassword?: boolean;
};

type CredentialPayload = {
  email: string;
  temporaryPassword: string;
};

const emptyForm = {
  first_name: "",
  last_name: "",
  title: "",
  specialties: "Hair",
  commissionRate: "10",
  baseSalary: "0",
  bio: "",
};

const statusLabel: Record<StaffAvailability, string> = {
  online: "Online",
  offline_today: "Offline",
  on_leave: "On leave",
};

function money(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString()}`;
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export default function Staff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [credentialModal, setCredentialModal] = useState<CredentialPayload | null>(null);

  const credentialText = useMemo(() => {
    if (!credentialModal) return "";
    return `Email: ${credentialModal.email}\nTemporary password: ${credentialModal.temporaryPassword}`;
  }, [credentialModal]);

  const loadStaff = useCallback(async () => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/staff?includeUnavailable=true`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not load staff");
    setStaff(data);
  }, []);

  useEffect(() => {
    loadStaff().catch((error) => {
      toast.error(error instanceof TypeError ? API_UNAVAILABLE_MESSAGE : error instanceof Error ? error.message : "Could not load staff");
    });
  }, [loadStaff]);

  const provisionStaff = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders({ "Content-Type": "application/json" });
      const res = await fetch(`${API_URL}/api/staff`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...form,
          commissionRate: Number(form.commissionRate),
          baseSalary: Number(form.baseSalary),
          specialties: form.specialties.split(",").map((item) => item.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not provision staff member");
      setCredentialModal(data.credentials);
      setForm(emptyForm);
      setFormOpen(false);
      toast.success("Staff account provisioned");
      await loadStaff();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not provision staff member");
    } finally {
      setLoading(false);
    }
  };

  const forcePasswordReset = async (member: StaffMember) => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders({ "Content-Type": "application/json" });
      const res = await fetch(`${API_URL}/api/staff/${member.id}/force-password-reset`, { method: "POST", headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not reset password");
      setCredentialModal(data.credentials);
      toast.success(`Temporary password generated for ${member.name}`);
      await loadStaff();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = async () => {
    try {
      await navigator.clipboard.writeText(credentialText);
      toast.success("Credentials copied");
    } catch {
      toast.error("Clipboard permission denied");
    }
  };

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle="Provision staff accounts, manage team access, and issue one-time temporary credentials."
        eyebrow="Identity & access"
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Staff Member
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {staff.map((member) => (
          <article key={member.id} className="rounded-lg border border-border bg-card p-5 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-semibold text-primary">
                  {initials(member.name)}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-foreground">{member.name}</h3>
                  <p className="truncate text-sm text-muted-foreground">{member.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{member.title}</p>
                </div>
              </div>
              <Badge variant={member.status === "online" ? "success" : member.status === "on_leave" ? "muted" : "warning"}>
                {statusLabel[member.status]}
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">Salary</p>
                <p className="mt-1 font-semibold">{money(member.baseSalary)}</p>
              </div>
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">Commission</p>
                <p className="mt-1 font-semibold">{member.commissionRate}%</p>
              </div>
              <div className="rounded-md bg-muted p-3 md:col-span-2">
                <p className="text-xs text-muted-foreground">Specialties</p>
                <p className="mt-1 truncate font-semibold">{member.specialties.join(", ") || "Not assigned"}</p>
              </div>
            </div>

            {member.mustResetPassword && (
              <Alert className="mt-4 border-warning/40 bg-warning/10">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Password reset required</AlertTitle>
                <AlertDescription>This staff member must set a permanent password after their next sign-in.</AlertDescription>
              </Alert>
            )}

            <div className="mt-4 flex justify-end">
              <Button variant="outline" disabled={loading} onClick={() => forcePasswordReset(member)}>
                <KeyRound className="h-4 w-4" />
                Force Reset Password
              </Button>
            </div>
          </article>
        ))}

        {staff.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-muted/40 p-10 text-center text-sm text-muted-foreground lg:col-span-2">
            <UserRound className="mx-auto mb-3 h-8 w-8" />
            No staff members loaded.
          </div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogDescription>
              Create a staff user in Supabase Auth and show temporary credentials once.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">First name</label>
              <Input value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Last name</label>
              <Input value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Senior Stylist" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Specialties</label>
              <Input value={form.specialties} onChange={(event) => setForm({ ...form, specialties: event.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Commission %</label>
              <Input type="number" value={form.commissionRate} onChange={(event) => setForm({ ...form, commissionRate: event.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Base salary</label>
              <Input type="number" value={form.baseSalary} onChange={(event) => setForm({ ...form, baseSalary: event.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Bio</label>
              <Textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button disabled={loading || !form.first_name || !form.last_name} onClick={provisionStaff}>
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Provision Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(credentialModal)} onOpenChange={(open) => !open && setCredentialModal(null)}>
        <DialogContent className="border-warning/50 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <ShieldAlert className="h-5 w-5" />
              One-Time Staff Credentials
            </DialogTitle>
            <DialogDescription>
              Copy these temporary credentials before closing this dialog.
            </DialogDescription>
          </DialogHeader>
          <Alert className="border-warning/40 bg-warning/10">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Displayed once</AlertTitle>
            <AlertDescription>
              The plaintext temporary password is processed through Supabase Auth using one-way cryptographic hashing and will not be displayed again after this modal closes.
            </AlertDescription>
          </Alert>
          <div className="rounded-lg border border-border bg-muted p-4 font-mono text-sm">
            <p>Email: {credentialModal?.email}</p>
            <p>Temporary password: {credentialModal?.temporaryPassword}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={copyCredentials}>
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button onClick={() => setCredentialModal(null)}>I have stored these credentials</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
