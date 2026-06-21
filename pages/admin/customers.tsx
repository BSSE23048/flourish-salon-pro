import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Customers from "@/pages/Customers";

export default function AdminCustomersPage() {
  return (
    <ProtectedRoute allowedRoles={["owner"]}>
      <AppLayout>
        <Customers />
      </AppLayout>
    </ProtectedRoute>
  );
}
