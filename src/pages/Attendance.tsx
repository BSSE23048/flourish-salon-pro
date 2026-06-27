import { useCallback, useEffect, useState } from "react";
import { Check, Clock, RefreshCw, X } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_UNAVAILABLE_MESSAGE, API_URL, SOCKET_OPTIONS } from "@/lib/api";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";

type AttendanceRow = {
  staffId: string;
  name: string;
  title: string;
  availabilityStatus: string;
  attendanceStatus: string;
  clockInAt: string | null;
  clockOutAt: string | null;
  attendancePercentage: number;
};
type LeaveRequest = { id: string; staffId: string; fromDate: string; toDate: string; reason: string; status: string };

function formatTime(value: string | null) {
  return value ? new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "-";
}

function statusBadge(status: string) {
  const good = status === "present" || status === "clocked_in" || status === "clocked_out" || status === "online";
  const warn = status === "absent" || status === "offline_today" || status === "pending";
  return (
    <Badge className={good ? "bg-success/10 text-success hover:bg-success/10" : warn ? "bg-warning/10 text-warning hover:bg-warning/10" : "bg-muted text-muted-foreground hover:bg-muted"}>
      {status.replace("_", " ")}
    </Badge>
  );
}

export default function Attendance() {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [apiReady, setApiReady] = useState(false);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/attendance?date=${date}&month=${month}`, { headers: { "x-role": "admin" } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load attendance");
      setRows(data.staff || []);
      setLeaveRequests(data.leaveRequests || []);
      setApiReady(true);
    } catch {
      setApiReady(false);
      toast.error(API_UNAVAILABLE_MESSAGE);
    } finally {
      setLoading(false);
    }
  }, [date, month]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  useEffect(() => {
    if (!apiReady) return;
    const socket: Socket = io(API_URL, SOCKET_OPTIONS);
    socket.on("attendance:update", loadAttendance);
    socket.on("leave:update", loadAttendance);
    return () => {
      socket.disconnect();
    };
  }, [apiReady, loadAttendance]);

  const markAttendance = async (staffId: string, status: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-role": "admin" },
        body: JSON.stringify({ staffId, date, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not mark attendance");
      toast.success("Attendance updated");
      await loadAttendance();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not mark attendance");
    }
  };

  const reviewLeave = async (requestId: string, status: "approved" | "rejected") => {
    try {
      const res = await fetch(`${API_URL}/api/admin/leave-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-role": "admin" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not review leave");
      toast.success(`Leave ${status}`);
      await loadAttendance();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not review leave");
    }
  };

  return (
    <div>
      <PageHeader
        title="Daily Attendance"
        subtitle="Admin-managed attendance, leave approvals, and monthly percentages"
        actions={
          <Button variant="outline" onClick={loadAttendance} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />Refresh
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 md:grid-cols-[180px_180px_1fr]">
        <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        <div className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
          Pending leave alerts: <span className="font-semibold text-foreground">{leaveRequests.filter((request) => request.status === "pending").length}</span>
        </div>
      </div>

      {leaveRequests.filter((request) => request.status === "pending").length > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-card shadow-card">
          <div className="border-b border-border p-4 text-sm font-semibold">Leave Requests</div>
          <div className="divide-y divide-border">
            {leaveRequests.filter((request) => request.status === "pending").map((request) => {
              const staffName = rows.find((row) => row.staffId === request.staffId)?.name || request.staffId;
              return (
                <div key={request.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="font-medium">{staffName}</p>
                    <p className="text-sm text-muted-foreground">{request.fromDate} to {request.toDate} - {request.reason || "No reason provided"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => reviewLeave(request.id, "approved")}><Check className="mr-1 h-3.5 w-3.5" />Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => reviewLeave(request.id, "rejected")}><X className="mr-1 h-3.5 w-3.5" />Reject</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4" />Attendance for {date}</h3>
        </div>
        <DataTable
          columns={[
            { key: "name", label: "Staff", render: (row) => <span className="font-medium">{row.name}</span> },
            { key: "title", label: "Role" },
            { key: "availabilityStatus", label: "Availability", render: (row) => statusBadge(row.availabilityStatus) },
            { key: "attendanceStatus", label: "Today", render: (row) => statusBadge(row.attendanceStatus) },
            { key: "attendancePercentage", label: "Month %", render: (row) => `${row.attendancePercentage}%` },
            { key: "clockInAt", label: "Clock In", render: (row) => formatTime(row.clockInAt) },
            { key: "clockOutAt", label: "Clock Out", render: (row) => formatTime(row.clockOutAt) },
            {
              key: "actions",
              label: "Admin Mark",
              render: (row) => (
                <Select value={row.attendanceStatus} onValueChange={(value) => markAttendance(row.staffId, value)}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["present", "absent", "half_day", "paid_leave", "unpaid_leave"].map((option) => <SelectItem key={option} value={option}>{option.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              ),
            },
          ]}
          data={rows}
          emptyMessage="No attendance data yet"
        />
      </div>
    </div>
  );
}
