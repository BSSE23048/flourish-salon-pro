import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Attendance from "@/pages/Attendance";

export default function AdminAttendancePage() {
  return (
    <ProtectedRoute allowedRoles={["owner"]}>
      <AppLayout>
        <Attendance />
      </AppLayout>
    </ProtectedRoute>
  );
}
