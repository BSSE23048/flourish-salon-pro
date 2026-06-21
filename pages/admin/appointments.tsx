import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Appointments from "@/pages/Appointments";

export default function AdminAppointmentsPage() {
  return (
    <ProtectedRoute allowedRoles={["owner"]}>
      <AppLayout>
        <Appointments />
      </AppLayout>
    </ProtectedRoute>
  );
}
