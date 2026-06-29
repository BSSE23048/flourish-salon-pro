import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, LockKeyhole, LogOut, Send, Timer, UserCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { API_UNAVAILABLE_MESSAGE, API_URL, getAuthHeaders } from "@/lib/api";

type Appointment = {
  id: string;
  customerName: string;
  customerEmail: string;
  serviceId: string;
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
type AttendanceLog = {
  id: string;
  clockInAt: string | null;
  clockOutAt: string | null;
  status: string;
};

const statusOptions = ["arrived", "in_progress", "completed", "no_show"];

const getApiError = async (res: Response, fallback: string) => {
  try {
    const data = await res.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
};

export default function StaffPortal() {
  const { signOut, profile } = useAuth();
  const [schedule, setSchedule] = useState<StaffSchedule>({ date: new Date().toISOString().slice(0, 10), appointments: [], attendance: null, attendancePercentage: 0, commission: 0, revenue: 0 });
  const [loading, setLoading] = useState(false);
  const [leave, setLeave] = useState({ fromDate: new Date().toISOString().slice(0, 10), toDate: new Date().toISOString().slice(0, 10), reason: "" });
  const [security, setSecurity] = useState({ current_password: "", new_password: "", confirm_new_password: "" });

  const fetchSchedule = async () => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/staff/me/schedule`, {
      headers,
    });
    const data = await res.json();
    setSchedule(data);
  };

  const requestLeave = async () => {
    try {
      const res = await fetch(`${API_URL}/api/staff/me/leave`, {
        method: "POST",
        headers: await getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(leave),
      });
      if (!res.ok) {
        toast.error(await getApiError(res, "Could not submit leave request"));
        return;
      }
      toast.success("Leave request sent to admin");
      setLeave({ ...leave, reason: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit leave request");
    }
  };

  useEffect(() => {
    fetchSchedule().catch(() => toast.error(API_UNAVAILABLE_MESSAGE));
  }, []);

  const updateStatus = async (appointmentId: string, status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/appointments/${appointmentId}/status`, {
        method: "PATCH",
        headers: await getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await getApiError(res, "Could not update appointment"));
      toast.success("Appointment status updated");
      await fetchSchedule();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = () => {
    const value = security.new_password;
    if (value.length < 12) return "New password must be at least 12 characters.";
    if (!/[A-Z]/.test(value)) return "New password must include an uppercase letter.";
    if (!/[a-z]/.test(value)) return "New password must include a lowercase letter.";
    if (!/[0-9]/.test(value)) return "New password must include a number.";
    if (!/[^A-Za-z0-9]/.test(value)) return "New password must include a symbol.";
    if (value === security.current_password) return "New password must be different from the current password.";
    if (value !== security.confirm_new_password) return "Password confirmation does not match.";
    return null;
  };

  const updatePassword = async () => {
    const validationError = validatePassword();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/staff/me/password`, {
        method: "POST",
        headers: await getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(security),
      });
      if (!res.ok) throw new Error(await getApiError(res, "Could not update password"));
      toast.success("Password updated. Admin monitoring has been notified.");
      setSecurity({ current_password: "", new_password: "", confirm_new_password: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Password update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f2ea] px-6 py-6 text-[#231f1b] lg:px-10">
      <header className="mb-6 flex flex-col gap-4 border-b border-[#decfbd] pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-[#6f6459]">Staff dashboard</p>
          <h1 className="font-serif text-4xl font-semibold">Hello, {profile?.full_name || schedule.staff?.name || "Sara"}</h1>
        </div>
        <Button variant="outline" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </header>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-[#decfbd] bg-white p-5">
          <CalendarDays className="mb-3 h-5 w-5 text-[#b8794d]" />
          <p className="text-sm text-[#6f6459]">Today</p>
          <p className="text-2xl font-semibold">{schedule.appointments.length} appointments</p>
        </div>
        <div className="rounded-lg border border-[#decfbd] bg-white p-5">
          <Wallet className="mb-3 h-5 w-5 text-[#b8794d]" />
          <p className="text-sm text-[#6f6459]">Total payable</p>
          <p className="text-2xl font-semibold">Rs. {Number(schedule.payroll?.payable || 0).toLocaleString()}</p>
          <p className="mt-1 text-xs text-[#6f6459]">{schedule.payroll?.paid ? "Salary paid" : "Salary unpaid"}</p>
        </div>
        <div className="rounded-lg border border-[#decfbd] bg-white p-5">
          <Timer className="mb-3 h-5 w-5 text-[#b8794d]" />
          <p className="text-sm text-[#6f6459]">Status workflow</p>
          <p className="text-2xl font-semibold">Arrived to completed</p>
        </div>
        <div className="rounded-lg border border-[#decfbd] bg-white p-5">
          <UserCheck className="mb-3 h-5 w-5 text-[#b8794d]" />
          <p className="text-sm text-[#6f6459]">Attendance</p>
          <p className="text-2xl font-semibold">{schedule.attendancePercentage}%</p>
          <p className="mt-1 text-xs text-[#6f6459]">{schedule.attendance?.status?.replace("_", " ") || "Not marked today"}</p>
        </div>
      </section>

      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-3 bg-white md:w-[560px]">
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="security">
            <LockKeyhole className="mr-2 h-4 w-4" />
            Security Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-6">
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-[#decfbd] bg-white p-5 shadow-sm">
              <h2 className="font-serif text-2xl">Attendance</h2>
              <p className="mt-1 text-sm text-[#6f6459]">Attendance is marked by admin only. Contact admin for corrections.</p>
              <p className="mt-4 text-3xl font-semibold">{schedule.attendancePercentage}%</p>
            </div>
            <div className="rounded-lg border border-[#decfbd] bg-white p-5 shadow-sm">
              <h2 className="font-serif text-2xl">Request Leave</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Input type="date" value={leave.fromDate} onChange={(event) => setLeave({ ...leave, fromDate: event.target.value })} />
                <Input type="date" value={leave.toDate} onChange={(event) => setLeave({ ...leave, toDate: event.target.value })} />
              </div>
              <Textarea className="mt-3" placeholder="Reason" value={leave.reason} onChange={(event) => setLeave({ ...leave, reason: event.target.value })} />
              <Button className="mt-3" onClick={requestLeave}><Send className="mr-2 h-4 w-4" />Send Request</Button>
            </div>
          </section>

          <section className="rounded-lg border border-[#decfbd] bg-white shadow-sm">
            <div className="border-b border-[#decfbd] p-5">
              <h2 className="font-serif text-2xl">Daily Schedule</h2>
            </div>
            <div className="divide-y divide-[#eadfd1]">
          {schedule.appointments.map((appointment) => (
            <div key={appointment.id} className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-[180px_minmax(0,1fr)_320px] lg:items-center">
              <div>
                <p className="font-medium">{new Date(appointment.startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
                <p className="text-sm text-[#6f6459]">{new Date(appointment.endAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
              </div>
              <div>
                <p className="font-medium">{appointment.customerName}</p>
                <p className="text-sm text-[#6f6459]">{appointment.customerEmail}</p>
                <Badge className="mt-2 bg-[#2f4f3f] text-white hover:bg-[#2f4f3f]">{appointment.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((status) => (
                  <Button key={status} size="sm" variant="outline" disabled={loading} onClick={() => updateStatus(appointment.id, status)}>
                    {status === "completed" && <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
                    {status.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </div>
          ))}
          {schedule.appointments.length === 0 && (
            <div className="p-10 text-center text-sm text-[#6f6459]">No appointments assigned for today.</div>
          )}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="payroll">
          <section className="rounded-lg border border-[#decfbd] bg-white p-5 shadow-sm">
            <h2 className="font-serif text-2xl">Payroll</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-6">
              {[
                ["Salary", schedule.payroll?.baseSalary || 0],
                ["Commission", schedule.payroll?.commission || schedule.commission || 0],
                ["Bonus", schedule.payroll?.bonuses || 0],
                ["Deduction", schedule.payroll?.deductions || 0],
                ["Payable", schedule.payroll?.payable || 0],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg bg-[#f7f2ea] p-4">
                  <p className="text-xs text-[#6f6459]">{label}</p>
                  <p className="mt-1 font-semibold">Rs. {Number(value).toLocaleString()}</p>
                </div>
              ))}
              <div className="rounded-lg bg-[#f7f2ea] p-4">
                <p className="text-xs text-[#6f6459]">Status</p>
                <p className="mt-1 font-semibold">{schedule.payroll?.paid ? "Paid" : "Unpaid"}</p>
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="security">
          <section className="rounded-lg border border-[#decfbd] bg-white p-5 shadow-sm">
            <h2 className="font-serif text-2xl">Security Settings</h2>
            <p className="mt-1 text-sm text-[#6f6459]">Update your password with a minimum of 12 characters, including uppercase, lowercase, number, and symbol.</p>
            <div className="mt-5 grid gap-4 md:max-w-xl">
              <Input type="password" placeholder="Current password" value={security.current_password} onChange={(event) => setSecurity({ ...security, current_password: event.target.value })} />
              <Input type="password" placeholder="New password" value={security.new_password} onChange={(event) => setSecurity({ ...security, new_password: event.target.value })} />
              <Input type="password" placeholder="Confirm new password" value={security.confirm_new_password} onChange={(event) => setSecurity({ ...security, confirm_new_password: event.target.value })} />
              <Button className="w-fit" disabled={loading} onClick={updatePassword}>
                <LockKeyhole className="mr-2 h-4 w-4" />
                Update Password
              </Button>
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </main>
  );
}
