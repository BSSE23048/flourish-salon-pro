import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Reports from "@/pages/Reports";

export default function AdminReportsPage() {
  return (
    <ProtectedRoute allowedRoles={["owner"]}>
      <AppLayout>
        <Reports />
      </AppLayout>
    </ProtectedRoute>
  );
}
