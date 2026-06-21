import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Staff from "@/pages/Staff";

export default function AdminStaffPage() {
  return (
    <ProtectedRoute allowedRoles={["owner"]}>
      <AppLayout>
        <Staff />
      </AppLayout>
    </ProtectedRoute>
  );
}
