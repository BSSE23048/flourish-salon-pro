import { useState } from "react";
import { Plus, Search, Phone, Mail } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const customers = [
  { id: 1, name: "Ayesha Khan", phone: "0300-1234567", email: "ayesha@email.com", visits: 12, lastVisit: "2026-02-26", totalSpent: "Rs. 42,500", notes: "Prefers Sara for haircuts" },
  { id: 2, name: "Fatima Ali", phone: "0321-7654321", email: "fatima@email.com", visits: 8, lastVisit: "2026-02-26", totalSpent: "Rs. 28,000", notes: "Allergic to certain products" },
  { id: 3, name: "Zainab Raza", phone: "0333-1112233", email: "zainab@email.com", visits: 15, lastVisit: "2026-02-26", totalSpent: "Rs. 55,200", notes: "VIP customer" },
  { id: 4, name: "Mehak Tariq", phone: "0345-9998887", email: "mehak@email.com", visits: 3, lastVisit: "2026-02-25", totalSpent: "Rs. 9,500", notes: "" },
  { id: 5, name: "Sana Malik", phone: "0312-5556667", email: "sana@email.com", visits: 20, lastVisit: "2026-02-25", totalSpent: "Rs. 78,000", notes: "Bridal packages regular" },
  { id: 6, name: "Rabia Noor", phone: "0300-4445556", email: "rabia@email.com", visits: 6, lastVisit: "2026-02-24", totalSpent: "Rs. 18,300", notes: "" },
];

export default function Customers() {
  const [search, setSearch] = useState("");

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Manage your customer database"
        actions={
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        }
      />

      <div className="bg-card rounded-xl border border-border shadow-card">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <DataTable
          columns={[
            { key: "name", label: "Name", render: (row) => <span className="font-medium">{row.name}</span> },
            { key: "phone", label: "Phone" },
            { key: "visits", label: "Visits", render: (row) => <span className="text-primary font-semibold">{row.visits}</span> },
            { key: "lastVisit", label: "Last Visit" },
            { key: "totalSpent", label: "Total Spent", render: (row) => <span className="font-medium">{row.totalSpent}</span> },
            { key: "notes", label: "Notes", render: (row) => <span className="text-muted-foreground text-xs">{row.notes || "—"}</span> },
          ]}
          data={filtered}
          emptyMessage="No customers found"
        />
      </div>
    </div>
  );
}
