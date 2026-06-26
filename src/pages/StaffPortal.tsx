import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, LogOut, Power, Timer, UserCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
  commission: number;
};

type StaffAvailability = "online" | "offline_today" | "on_leave";
type AttendanceLog = {
  id: string;
  clockInAt: string | null;
  clockOutAt: string | null;
  status: "clocked_in" | "clocked_out";
};

const statusOptions = ["arrived", "in_progress", "completed", "no_show"];
const availabilityOptions: { value: StaffAvailability; label: string }[] = [
  { value: "online", label: "Online" },
  { value: "offline_today", label: "Offline Today" },
  { value: "on_leave", label: "On Leave" },
];

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
  const [schedule, setSchedule] = useState<StaffSchedule>({ date: new Date().toISOString().slice(0, 10), appointments: [], attendance: null, commission: 0 });
  const [loading, setLoading] = useState(false);

  const fetchSchedule = async () => {
    const res = await fetch(`${API_URL}/api/staff/me/schedule`, {
      headers: { "x-role": "staff", "x-staff-id": "stf-sara" },
    });
    const data = await res.json();
    setSchedule(data);
  };

  const updateAvailability = async (status: StaffAvailability) => {
    const staffId = schedule.staff?.id || "stf-sara";
    try {
      const res = await fetch(`${API_URL}/api/staff/${staffId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-role": "staff", "x-staff-id": staffId },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        toast.error(await getApiError(res, "Could not update availability"));
        return;
      }
      toast.success(`Availability set to ${status.replace("_", " ")}`);
      await fetchSchedule();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update availability");
    }
  };

  const punchClock = async (action: "clock-in" | "clock-out") => {
    try {
      const res = await fetch(`${API_URL}/api/staff/me/${action}`, {
        method: "POST",
        headers: { "x-role": "staff", "x-staff-id": schedule.staff?.id || "stf-sara" },
      });
      if (!res.ok) {
        toast.error(await getApiError(res, "Attendance update failed"));
        return;
      }
      toast.success(action === "clock-in" ? "Clocked in" : "Clocked out");
      await fetchSchedule();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Attendance update failed");
    }
  };

  useEffect(() => {
    fetchSchedule().catch(() => toast.error("Could not load staff schedule"));
  }, []);

  const updateStatus = async (appointmentId: string, status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/appointments/${appointmentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-role": "staff", "x-staff-id": "stf-sara" },
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
          <p className="text-sm text-[#6f6459]">Estimated commission</p>
          <p className="text-2xl font-semibold">Rs. {schedule.commission.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-[#decfbd] bg-white p-5">
          <Timer className="mb-3 h-5 w-5 text-[#b8794d]" />
          <p className="text-sm text-[#6f6459]">Status workflow</p>
          <p className="text-2xl font-semibold">Arrived to completed</p>
        </div>
        <div className="rounded-lg border border-[#decfbd] bg-white p-5">
          <UserCheck className="mb-3 h-5 w-5 text-[#b8794d]" />
          <p className="text-sm text-[#6f6459]">Attendance</p>
          <p className="text-2xl font-semibold">{schedule.attendance?.status?.replace("_", " ") || "Absent"}</p>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-[#decfbd] bg-white p-5 shadow-sm">
          <h2 className="font-serif text-2xl">Availability</h2>
          <p className="mt-1 text-sm text-[#6f6459]">Offline staff are hidden from customer booking immediately.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {availabilityOptions.map((option) => (
              <Button
                key={option.value}
                variant={schedule.staff?.status === option.value ? "default" : "outline"}
                onClick={() => updateAvailability(option.value)}
              >
                <Power className="mr-2 h-4 w-4" />
                {option.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-[#decfbd] bg-white p-5 shadow-sm">
          <h2 className="font-serif text-2xl">Clock</h2>
          <p className="mt-1 text-sm text-[#6f6459]">
            {schedule.attendance?.clockInAt ? `Clocked in at ${new Date(schedule.attendance.clockInAt).toLocaleTimeString()}` : "Not clocked in yet"}
          </p>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => punchClock("clock-in")} disabled={Boolean(schedule.attendance?.clockInAt && !schedule.attendance?.clockOutAt)}>Clock In</Button>
            <Button variant="outline" onClick={() => punchClock("clock-out")} disabled={!schedule.attendance?.clockInAt || Boolean(schedule.attendance?.clockOutAt)}>Clock Out</Button>
          </div>
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
    </main>
  );
}
