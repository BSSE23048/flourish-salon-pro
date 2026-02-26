import { useState } from "react";
import { Plus, Trophy } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import FormDialog from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const initialStaff = [
  { id: 1, name: "Sara Ahmed", role: "Senior Stylist", phone: "0300-1111111", services: 145, commission: "15%", earnings: "Rs. 63,000", status: "Active" },
  { id: 2, name: "Nadia Hussain", role: "Makeup Artist", phone: "0321-2222222", services: 128, commission: "12%", earnings: "Rs. 52,000", status: "Active" },
  { id: 3, name: "Hina Rashid", role: "Nail Technician", phone: "0333-3333333", services: 112, commission: "10%", earnings: "Rs. 38,500", status: "Active" },
  { id: 4, name: "Amina Sheikh", role: "Junior Stylist", phone: "0345-4444444", services: 67, commission: "8%", earnings: "Rs. 21,000", status: "Active" },
  { id: 5, name: "Rukhsar Ali", role: "Aesthetician", phone: "0312-5555555", services: 89, commission: "12%", earnings: "Rs. 44,200", status: "On Leave" },
];

export default function Staff() {
  const [staffList, setStaffList] = useState(initialStaff);
  const [showAdd, setShowAdd] = useState(false);

  const leaderboard = [...staffList].sort((a, b) => b.services - a.services).slice(0, 3);

  return (
    <div>
      <PageHeader
        title="Staff Management"
        subtitle="Manage your team and track performance"
        actions={<Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-2" />Add Staff</Button>}
      />

      <FormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title="Add Staff Member"
        fields={[
          { key: "name", label: "Full Name", required: true, placeholder: "e.g. Sara Ahmed" },
          { key: "phone", label: "Phone", type: "tel", required: true, placeholder: "0300-1234567" },
          { key: "role", label: "Role", type: "select", options: ["Senior Stylist", "Junior Stylist", "Makeup Artist", "Nail Technician", "Aesthetician", "Receptionist"], required: true },
          { key: "commission", label: "Commission %", type: "number", required: true, placeholder: "e.g. 10" },
        ]}
        onSubmit={(data) => {
          const newStaff = {
            id: staffList.length + 1,
            name: data.name,
            role: data.role,
            phone: data.phone,
            services: 0,
            commission: `${data.commission}%`,
            earnings: "Rs. 0",
            status: "Active",
          };
          setStaffList([...staffList, newStaff]);
          toast.success(`${data.name} added to staff!`);
        }}
        submitLabel="Add Staff"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {leaderboard.map((s, i) => (
          <div key={s.id} className="bg-card rounded-xl border border-border p-5 shadow-card flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? "bg-warning/10 text-warning" : i === 1 ? "bg-muted text-muted-foreground" : "bg-warning/5 text-warning/70"}`}>
              {i === 0 ? <Trophy className="w-5 h-5" /> : `#${i + 1}`}
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.services} services · {s.earnings}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card">
        <DataTable
          columns={[
            { key: "name", label: "Name", render: (row) => <span className="font-medium">{row.name}</span> },
            { key: "role", label: "Role" },
            { key: "phone", label: "Phone" },
            { key: "services", label: "Services Done", render: (row) => <span className="text-primary font-semibold">{row.services}</span> },
            { key: "commission", label: "Commission %" },
            { key: "earnings", label: "Earnings", render: (row) => <span className="font-medium">{row.earnings}</span> },
            {
              key: "status", label: "Status",
              render: (row) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.status === "Active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{row.status}</span>
              ),
            },
          ]}
          data={staffList}
        />
      </div>
    </div>
  );
}
