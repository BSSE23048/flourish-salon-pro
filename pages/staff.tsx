import ProtectedRoute from "@/components/ProtectedRoute";
import StaffPortal from "@/pages/StaffPortal";

export default function StaffDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["staff", "owner"]}>
      <StaffPortal />
    </ProtectedRoute>
  );
}
