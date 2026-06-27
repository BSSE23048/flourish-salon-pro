import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Payroll from "@/pages/Payroll";

export default function AdminPayrollPage() {
  return (
    <ProtectedRoute allowedRoles={["owner"]}>
      <AppLayout>
        <Payroll />
      </AppLayout>
    </ProtectedRoute>
  );
}
