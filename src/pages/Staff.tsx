import { useEffect, useState } from "react";
import { Power, Trophy } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type StaffAvailability = "online" | "offline_today" | "on_leave";
type StaffMember = {
  id: string;
  name: string;
  title: string;
  specialties: string[];
  commissionRate: number;
  status: StaffAvailability;
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

  const loadStaff = async () => {
    const res = await fetch(`${API_URL}/api/staff?includeUnavailable=true`, { headers: { "x-role": "admin" } });
    const data = await res.json();
    setStaffList(data);
  };

  useEffect(() => {
    loadStaff().catch(() => toast.error("Could not load staff"));
  }, []);

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

  const leaderboard = [...staffList].sort((a, b) => b.commissionRate - a.commissionRate).slice(0, 3);

  return (
    <div>
      <PageHeader
        title="Staff Management"
        subtitle="Manage team availability, specialties, and admin overrides"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {leaderboard.map((s, i) => (
          <div key={s.id} className="bg-card rounded-xl border border-border p-5 shadow-card flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>
              {i === 0 ? <Trophy className="w-5 h-5" /> : `#${i + 1}`}
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.commissionRate}% commission · {s.specialties.join(", ")}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card">
        <DataTable
          columns={[
            { key: "name", label: "Name", render: (row) => <span className="font-medium">{row.name}</span> },
            { key: "title", label: "Role" },
            { key: "specialties", label: "Specialties", render: (row) => row.specialties.join(", ") },
            { key: "commissionRate", label: "Commission", render: (row) => `${row.commissionRate}%` },
            { key: "status", label: "Status", render: (row) => statusBadge(row.status) },
            {
              key: "actions",
              label: "Admin Override",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  {availabilityOptions.map((option) => (
                    <Button
                      key={option.value}
                      size="sm"
                      variant={row.status === option.value ? "default" : "outline"}
                      disabled={loading}
                      onClick={() => updateAvailability(row.id, option.value)}
                    >
                      <Power className="mr-1 h-3.5 w-3.5" />
                      {option.label}
                    </Button>
                  ))}
                </div>
              ),
            },
          ]}
          data={staffList}
          emptyMessage="No staff found"
        />
      </div>
    </div>
  );
}
