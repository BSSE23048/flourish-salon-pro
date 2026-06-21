import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Services from "@/pages/Services";

export default function AdminServicesPage() {
  return (
    <ProtectedRoute allowedRoles={["owner"]}>
      <AppLayout>
        <Services />
      </AppLayout>
    </ProtectedRoute>
  );
}
