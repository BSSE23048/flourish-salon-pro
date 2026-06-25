import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Clock, RefreshCw } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type AttendanceRow = {
  staffId: string;
  name: string;
  title: string;
  availabilityStatus: string;
  attendanceStatus: string;
  clockInAt: string | null;
  clockOutAt: string | null;
};

function formatTime(value: string | null) {
  return value ? new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "-";
}

function statusBadge(status: string) {
  const good = status === "clocked_in" || status === "online";
  const warn = status === "absent" || status === "offline_today";
  return (
    <Badge className={good ? "bg-success/10 text-success hover:bg-success/10" : warn ? "bg-warning/10 text-warning hover:bg-warning/10" : "bg-muted text-muted-foreground hover:bg-muted"}>
      {status.replace("_", " ")}
    </Badge>
  );
}

export default function Attendance() {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/attendance`, { headers: { "x-role": "admin" } });
      const data = await res.json();
      setRows(data.staff || []);
    } catch {
      toast.error("Could not load attendance");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  useEffect(() => {
    const socket: Socket = io(API_URL);
    socket.on("attendance:update", (staff) => setRows(staff));
    socket.on("staff:update", loadAttendance);
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div>
      <PageHeader
        title="Daily Attendance"
        subtitle="Live staff presence, absence, and availability status"
        actions={
          <Button variant="outline" onClick={loadAttendance} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />
      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4" />
            Today&apos;s attendance
          </h3>
        </div>
        <DataTable
          columns={[
            { key: "name", label: "Staff", render: (row) => <span className="font-medium">{row.name}</span> },
            { key: "title", label: "Role" },
            { key: "availabilityStatus", label: "Availability", render: (row) => statusBadge(row.availabilityStatus) },
            { key: "attendanceStatus", label: "Attendance", render: (row) => statusBadge(row.attendanceStatus) },
            { key: "clockInAt", label: "Clock In", render: (row) => formatTime(row.clockInAt) },
            { key: "clockOutAt", label: "Clock Out", render: (row) => formatTime(row.clockOutAt) },
          ]}
          data={rows}
          emptyMessage="No attendance data yet"
        />
      </div>
    </div>
  );
}
