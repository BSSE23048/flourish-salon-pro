import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Inventory from "@/pages/Inventory";

export default function AdminInventoryPage() {
  return (
    <ProtectedRoute allowedRoles={["owner"]}>
      <AppLayout>
        <Inventory />
      </AppLayout>
    </ProtectedRoute>
  );
}
