import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ClipboardCheck, RefreshCw, X } from "lucide-react";
import { io, Socket } from "socket.io-client";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { API_UNAVAILABLE_MESSAGE, API_URL, SOCKET_OPTIONS } from "@/lib/api";
import { localDateKey, localMonthKey } from "@/lib/date";
import { toast } from "sonner";

type AttendanceEntry = { id: string; staffId: string; date: string; status: AttendanceStatus };
type MonthlyStaff = { staffId: string; name: string; percentage: number; rows: AttendanceEntry[] };
type AttendanceRow = {
  staffId: string;
  name: string;
  title: string;
  availabilityStatus: string;
  attendanceStatus: string;
  attendancePercentage: number;
};
type LeaveRequest = { id: string; staffId: string; fromDate: string; toDate: string; reason: string; status: string };
type AttendanceStatus = "present" | "absent" | "half_day" | "paid_leave" | "unpaid_leave";

const statusOptions: AttendanceStatus[] = ["present", "absent", "half_day", "paid_leave", "unpaid_leave"];
const statusShort: Record<string, string> = {
  present: "P",
  absent: "A",
  half_day: "H",
  paid_leave: "PL",
  unpaid_leave: "UL",
};

function daysInMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const total = new Date(year, monthNumber, 0).getDate();
  return Array.from({ length: total }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`);
}

function statusBadge(status: string) {
  const good = status === "present" || status === "paid_leave" || status === "online";
  const warn = status === "absent" || status === "unpaid_leave" || status === "offline_today" || status === "pending";
  return (
    <Badge className={good ? "bg-success/10 text-success hover:bg-success/10" : warn ? "bg-warning/10 text-warning hover:bg-warning/10" : "bg-muted text-muted-foreground hover:bg-muted"}>
      {status.replace("_", " ")}
    </Badge>
  );
}

function entryFor(staff: MonthlyStaff, date: string) {
  return staff.rows.find((entry) => entry.date === date);
}

export default function Attendance() {
  const [dailyRows, setDailyRows] = useState<AttendanceRow[]>([]);
  const [monthlyRows, setMonthlyRows] = useState<MonthlyStaff[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [date, setDate] = useState(localDateKey());
  const [month, setMonth] = useState(localMonthKey());
  const [loading, setLoading] = useState(false);
  const [apiReady, setApiReady] = useState(false);

  const monthDays = useMemo(() => daysInMonth(month), [month]);
  const pendingLeave = leaveRequests.filter((request) => request.status === "pending");
  const averageAttendance = monthlyRows.length
    ? Math.round(monthlyRows.reduce((sum, row) => sum + Number(row.percentage || 0), 0) / monthlyRows.length)
    : 0;

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/attendance?date=${date}&month=${month}`, { headers: { "x-role": "admin" } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load attendance");
      setDailyRows(data.staff || []);
      setMonthlyRows(data.monthly || []);
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

  const markAttendance = async (staffId: string, status: AttendanceStatus, targetDate = date) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-role": "admin" },
        body: JSON.stringify({ staffId, date: targetDate, status }),
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
        title="Attendance"
        subtitle="Month-wise staff attendance ledger with realtime admin updates."
        actions={
          <Button variant="outline" onClick={loadAttendance} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-[180px_180px_1fr_1fr]">
        <Input type="month" value={month} onChange={(event) => { setMonth(event.target.value); setDate(`${event.target.value}-01`); }} />
        <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Average attendance</p>
            <p className="mt-1 text-2xl font-semibold">{averageAttendance}%</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pending leave alerts</p>
            <p className="mt-1 text-2xl font-semibold">{pendingLeave.length}</p>
          </CardContent>
        </Card>
      </div>

      {pendingLeave.length > 0 && (
        <Card className="mb-6 shadow-card">
          <CardHeader className="border-b border-border p-4">
            <CardTitle className="text-sm">Leave Requests</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {pendingLeave.map((request) => {
              const staffName = dailyRows.find((row) => row.staffId === request.staffId)?.name || request.staffId;
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
          </CardContent>
        </Card>
      )}

      <Card className="mb-6 shadow-card">
        <CardHeader className="border-b border-border p-5">
          <CardTitle className="flex items-center gap-2 text-sm"><ClipboardCheck className="h-4 w-4" />Daily Marking for {date}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Today</TableHead>
                <TableHead>Month %</TableHead>
                <TableHead>Admin Mark</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyRows.map((row) => (
                <TableRow key={row.staffId}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>{statusBadge(row.availabilityStatus)}</TableCell>
                  <TableCell>{statusBadge(row.attendanceStatus)}</TableCell>
                  <TableCell>{row.attendancePercentage}%</TableCell>
                  <TableCell>
                    <Select value={row.attendanceStatus} onValueChange={(value) => markAttendance(row.staffId, value as AttendanceStatus)}>
                      <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => <SelectItem key={option} value={option}>{option.replace("_", " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader className="border-b border-border p-5">
          <CardTitle className="text-sm">Month Ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="sticky left-0 z-10 bg-card px-4 py-3 text-left font-medium text-muted-foreground">Staff</th>
                  <th className="px-3 py-3 text-left font-medium text-muted-foreground">%</th>
                  {monthDays.map((day) => (
                    <th key={day} className="px-2 py-3 text-center text-xs font-medium text-muted-foreground">{Number(day.slice(-2))}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyRows.map((staff) => (
                  <tr key={staff.staffId} className="border-b border-border/60 last:border-0">
                    <td className="sticky left-0 z-10 bg-card px-4 py-3 font-medium">{staff.name}</td>
                    <td className="px-3 py-3 font-semibold text-primary">{staff.percentage}%</td>
                    {monthDays.map((day) => {
                      const entry = entryFor(staff, day);
                      const value = entry?.status || "absent";
                      return (
                        <td key={day} className="px-1 py-2 text-center">
                          <Select value={value} onValueChange={(next) => markAttendance(staff.staffId, next as AttendanceStatus, day)}>
                            <SelectTrigger className="mx-auto h-8 w-14 justify-center px-2 text-xs">
                              <SelectValue>{statusShort[value] || "-"}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((option) => <SelectItem key={option} value={option}>{option.replace("_", " ")}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
