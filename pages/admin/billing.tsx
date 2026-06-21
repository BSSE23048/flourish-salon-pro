import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Billing from "@/pages/Billing";

export default function AdminBillingPage() {
  return (
    <ProtectedRoute allowedRoles={["owner"]}>
      <AppLayout>
        <Billing />
      </AppLayout>
    </ProtectedRoute>
  );
}
