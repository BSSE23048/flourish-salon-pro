import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import SettingsPage from "@/pages/Settings";

export default function AdminSettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["owner"]}>
      <AppLayout>
        <SettingsPage />
      </AppLayout>
    </ProtectedRoute>
  );
}
