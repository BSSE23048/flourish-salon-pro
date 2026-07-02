import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock, KeyRound, LogOut, Send, UserCheck, Wallet } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { API_UNAVAILABLE_MESSAGE, API_URL, SOCKET_OPTIONS } from "@/lib/api";
import { localDateKey, localMonthKey } from "@/lib/date";

type Appointment = {
  id: string;
  customerName: string;
  customerEmail: string;
  serviceName?: string;
  startAt: string;
  endAt: string;
  status: string;
};

type StaffSchedule = {
  staff?: { id: string; name: string; title: string; status: StaffAvailability };
  date: string;
  appointments: Appointment[];
  attendance: AttendanceLog | null;
  attendancePercentage: number;
  commission: number;
  revenue: number;
  payroll?: {
    baseSalary: number;
    commission: number;
    deductions: number;
    bonuses: number;
    payable: number;
    paid: boolean;
    paidAt: string | null;
  };
};

type StaffAvailability = "online" | "offline_today" | "on_leave";
type AttendanceLog = { id: string; date?: string; clockInAt: string | null; clockOutAt: string | null; status: string };
type AttendanceMonth = {
  month: string;
  percentage: number;
  rows: Array<{ id: string; date: string; status: string }>;
  leaveRequests: Array<{ id: string; fromDate: string; toDate: string; reason: string; status: string }>;
};

const statusOptions = ["arrived", "in_progress", "completed", "no_show"];
const STAFF_ID_STORAGE_KEY = "flourish-staff-id";

const getApiError = async (res: Response, fallback: string) => {
  try {
    const data = await res.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
};

function money(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString()}`;
}

function statusBadge(status = "pending") {
  const normalized = status.toLowerCase();
  const good = ["completed", "present", "paid", "paid_leave"].includes(normalized);
  const warn = ["no_show", "absent", "unpaid", "unpaid_leave"].includes(normalized);
  return (
    <Badge className={good ? "bg-success/10 text-success hover:bg-success/10" : warn ? "bg-warning/10 text-warning hover:bg-warning/10" : "bg-primary/10 text-primary hover:bg-primary/10"}>
      {status.replace("_", " ")}
    </Badge>
  );
}

function attendanceWeight(status: string) {
  if (status === "present" || status === "paid_leave") return 1;
  if (status === "half_day") return 0.5;
  return 0;
}

export default function StaffPortal() {
  const { signOut, profile } = useAuth();
  const [schedule, setSchedule] = useState<StaffSchedule>({ date: localDateKey(), appointments: [], attendance: null, attendancePercentage: 0, commission: 0, revenue: 0 });
  const [attendanceMonth, setAttendanceMonth] = useState<AttendanceMonth>({ month: localMonthKey(), percentage: 0, rows: [], leaveRequests: [] });
  const [month, setMonth] = useState(localMonthKey());
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("schedule");
  const [leave, setLeave] = useState({ fromDate: localDateKey(), toDate: localDateKey(), reason: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const currentStaffId = useCallback(() => {
    if (typeof window !== "undefined") return window.localStorage.getItem(STAFF_ID_STORAGE_KEY) || "stf-sara";
    return "stf-sara";
  }, []);

  const fetchSchedule = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/staff/me/schedule?date=${localDateKey()}`, {
      headers: { "x-role": "staff", "x-staff-id": currentStaffId() },
    });
    if (!res.ok) throw new Error(await getApiError(res, "Could not load schedule"));
    const data = await res.json();
    setSchedule((current) => ({ ...current, ...data, appointments: Array.isArray(data.appointments) ? data.appointments : [] }));
  }, [currentStaffId]);

  const fetchAttendance = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/staff/me/attendance?month=${month}`, {
      headers: { "x-role": "staff", "x-staff-id": currentStaffId() },
    });
    if (!res.ok) throw new Error(await getApiError(res, "Could not load attendance"));
    const data = await res.json();
    setAttendanceMonth({
      month: data.month || month,
      percentage: Number(data.percentage || 0),
      rows: Array.isArray(data.rows) ? data.rows : [],
      leaveRequests: Array.isArray(data.leaveRequests) ? data.leaveRequests : [],
    });
  }, [currentStaffId, month]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchSchedule(), fetchAttendance()]);
  }, [fetchAttendance, fetchSchedule]);

  useEffect(() => {
    refresh().catch(() => toast.error(API_UNAVAILABLE_MESSAGE));
  }, [refresh]);

  useEffect(() => {
    const socket: Socket = io(API_URL, SOCKET_OPTIONS);
    socket.on("appointments:update", refresh);
    socket.on("attendance:update", refresh);
    socket.on("leave:update", refresh);
    socket.on("payroll:update", refresh);
    socket.on("staff:commission:update", refresh);
    return () => {
      socket.disconnect();
    };
  }, [refresh]);

  const requestLeave = async () => {
    try {
      const res = await fetch(`${API_URL}/api/staff/me/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-role": "staff", "x-staff-id": currentStaffId() },
        body: JSON.stringify(leave),
      });
      if (!res.ok) throw new Error(await getApiError(res, "Could not submit leave request"));
      toast.success("Leave request sent to admin");
      setLeave({ ...leave, reason: "" });
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit leave request");
    }
  };

  const changePassword = async () => {
    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/staff/me/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-role": "staff", "x-staff-id": currentStaffId() },
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }),
      });
      if (!res.ok) throw new Error(await getApiError(res, "Could not change password"));
      toast.success("Password updated");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change password");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (appointmentId: string, status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/appointments/${appointmentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-role": "staff", "x-staff-id": currentStaffId() },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await getApiError(res, "Could not update appointment"));
      toast.success("Appointment status updated");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const payroll = schedule.payroll;
  const attendanceByStatus = useMemo(() => {
    return (attendanceMonth.rows || []).reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {});
  }, [attendanceMonth.rows]);
  const attendanceScore = (attendanceMonth.rows || []).reduce((sum, row) => sum + attendanceWeight(row.status), 0);

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-10">
      <header className="mb-8 flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Staff Portal</p>
          <h1 className="mt-2 font-editorial text-4xl font-semibold tracking-tight">
            Hello, {profile?.full_name || schedule.staff?.name || "Staff"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{schedule.staff?.title || "Team member"} · {localDateKey()}</p>
        </div>
        <Button variant="outline" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </header>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="p-5">
            <CalendarDays className="mb-4 h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">Today</p>
            <p className="mt-1 text-2xl font-semibold">{schedule.appointments.length} appointments</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-5">
            <Wallet className="mb-4 h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">Net payable</p>
            <p className="mt-1 text-2xl font-semibold">{money(payroll?.payable || 0)}</p>
            <div className="mt-2">{statusBadge(payroll?.paid ? "Paid" : "Unpaid")}</div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-5">
            <UserCheck className="mb-4 h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">Attendance</p>
            <p className="mt-1 text-2xl font-semibold">{attendanceMonth.percentage || schedule.attendancePercentage}%</p>
            <Progress className="mt-3 h-2" value={attendanceMonth.percentage || schedule.attendancePercentage} />
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-5">
            <Clock className="mb-4 h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">Today status</p>
            <div className="mt-2">{statusBadge(schedule.attendance?.status || "Not marked")}</div>
          </CardContent>
        </Card>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl md:w-[520px] md:grid-cols-4">
          <TabsTrigger value="schedule" onClick={() => setActiveTab("schedule")}>Schedule</TabsTrigger>
          <TabsTrigger value="attendance" onClick={() => setActiveTab("attendance")}>Attendance</TabsTrigger>
          <TabsTrigger value="payroll" onClick={() => setActiveTab("payroll")}>Payroll</TabsTrigger>
          <TabsTrigger value="security" onClick={() => setActiveTab("security")}>Security</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <Card className="shadow-card">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-lg">Daily Timeline</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Workflow</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.appointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell>
                        <p className="font-medium">{new Date(appointment.startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
                        <p className="text-xs text-muted-foreground">{new Date(appointment.endAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{appointment.customerName}</p>
                        <p className="text-xs text-muted-foreground">{appointment.customerEmail}</p>
                      </TableCell>
                      <TableCell>{appointment.serviceName || "Service"}</TableCell>
                      <TableCell>{statusBadge(appointment.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {statusOptions.map((status) => (
                            <Button key={status} size="sm" variant="outline" disabled={loading} onClick={() => updateStatus(appointment.id, status)}>
                              {status === "completed" && <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
                              {status.replace("_", " ")}
                            </Button>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {schedule.appointments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">No appointments assigned for today.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Monthly Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="mb-5" />
                <div className="relative mx-auto mb-5 flex h-40 w-40 items-center justify-center rounded-full border-[14px] border-primary/15">
                  <div className="absolute inset-[-14px] rounded-full border-[14px] border-primary" style={{ clipPath: `inset(${100 - (attendanceMonth.percentage || 0)}% 0 0 0)` }} />
                  <div className="relative text-center">
                    <p className="text-3xl font-bold">{attendanceMonth.percentage}%</p>
                    <p className="text-xs text-muted-foreground">active month</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {Object.entries(attendanceByStatus).map(([status, count]) => (
                    <div key={status} className="rounded-lg bg-muted p-3">
                      <p className="text-xs text-muted-foreground">{status.replace("_", " ")}</p>
                      <p className="font-semibold">{count}</p>
                    </div>
                  ))}
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">score days</p>
                    <p className="font-semibold">{attendanceScore}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-lg">Attendance Records</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceMonth.rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.date}</TableCell>
                        <TableCell>{statusBadge(row.status)}</TableCell>
                      </TableRow>
                    ))}
                    {attendanceMonth.rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="py-10 text-center text-sm text-muted-foreground">No attendance marked for this month.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payroll">
          <Card className="shadow-card">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-lg">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-6 md:grid-cols-5">
              {[
                ["Base salary", payroll?.baseSalary || 0],
                ["Commission", payroll?.commission || schedule.commission || 0],
                ["Bonuses", payroll?.bonuses || 0],
                ["Deductions", payroll?.deductions || 0],
                ["Net payable", payroll?.payable || 0],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl border border-border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 font-semibold">{money(Number(value))}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Send className="h-4 w-4" />Request Leave</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Input type="date" value={leave.fromDate} onChange={(event) => setLeave({ ...leave, fromDate: event.target.value })} />
                  <Input type="date" value={leave.toDate} onChange={(event) => setLeave({ ...leave, toDate: event.target.value })} />
                </div>
                <Textarea className="mt-3" placeholder="Reason" value={leave.reason} onChange={(event) => setLeave({ ...leave, reason: event.target.value })} />
                <Button className="mt-3" onClick={requestLeave}><Send className="mr-2 h-4 w-4" />Send Request</Button>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><KeyRound className="h-4 w-4" />Change Password</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  <Input type="password" placeholder="Current password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} />
                  <Input type="password" placeholder="New password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} />
                  <Input type="password" placeholder="Confirm new password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} />
                </div>
                <Button className="mt-3" disabled={loading} onClick={changePassword}>Update Password</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
