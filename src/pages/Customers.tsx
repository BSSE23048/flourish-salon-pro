import { useState } from "react";
import { Plus, Search, Star } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import FormDialog from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const initialCustomers = [
  { id: 1, name: "Ayesha Khan",  phone: "0300-1234567", email: "ayesha@email.com",  visits: 12, lastVisit: "2026-02-26", totalSpent: "Rs. 42,500", notes: "Prefers Sara for haircuts", vip: true },
  { id: 2, name: "Fatima Ali",   phone: "0321-7654321", email: "fatima@email.com",  visits: 8,  lastVisit: "2026-02-26", totalSpent: "Rs. 28,000", notes: "Allergic to certain products", vip: false },
  { id: 3, name: "Zainab Raza",  phone: "0333-1112233", email: "zainab@email.com",  visits: 15, lastVisit: "2026-02-26", totalSpent: "Rs. 55,200", notes: "VIP customer", vip: true },
  { id: 4, name: "Mehak Tariq",  phone: "0345-9998887", email: "mehak@email.com",   visits: 3,  lastVisit: "2026-02-25", totalSpent: "Rs. 9,500",  notes: "", vip: false },
  { id: 5, name: "Sana Malik",   phone: "0312-5556667", email: "sana@email.com",    visits: 20, lastVisit: "2026-02-25", totalSpent: "Rs. 78,000", notes: "Bridal packages regular", vip: true },
  { id: 6, name: "Rabia Noor",   phone: "0300-4445556", email: "rabia@email.com",   visits: 6,  lastVisit: "2026-02-24", totalSpent: "Rs. 18,300", notes: "", vip: false },
];

function CustomerAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-semibold text-primary">{initials}</span>
    </div>
  );
}

export default function Customers() {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Your client database — history, preferences, and spending at a glance."
        eyebrow="Operations"
        actions={<Button onClick={() => setShowAdd(true)}><Plus />Add Customer</Button>}
      />

      <FormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title="Add Customer"
        description="Add a new client to your database."
        fields={[
          { key: "name",  label: "Full Name",  required: true, placeholder: "e.g. Ayesha Khan" },
          { key: "phone", label: "Phone",      type: "tel",    required: true, placeholder: "0300-1234567" },
          { key: "email", label: "Email",      type: "email",  placeholder: "client@email.com" },
          { key: "notes", label: "Notes",      type: "textarea", placeholder: "Preferences, allergies, notes…" },
        ]}
        onSubmit={(data) => {
          setCustomers([{
            id: customers.length + 1, name: data.name, phone: data.phone,
            email: data.email, notes: data.notes || "",
            visits: 0, lastVisit: new Date().toISOString().split("T")[0],
            totalSpent: "Rs. 0", vip: false,
          }, ...customers]);
          toast.success(`${data.name} added to customers.`);
        }}
        submitLabel="Add Customer"
      />

      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        {/* Search toolbar */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground stroke-[1.5]" />
            <Input
              placeholder="Search by name or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11"
            />
          </div>
          <div className="text-xs text-muted-foreground flex-shrink-0">
            {filtered.length} clients
          </div>
        </div>

        <DataTable
          columns={[
            {
              key: "name", label: "Customer",
              render: (row) => (
                <div className="flex items-center gap-3">
                  <CustomerAvatar name={row.name as string} />
                  <div>
                    <p className="font-medium text-foreground leading-none">{row.name as string}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{row.email as string}</p>
                  </div>
                </div>
              ),
            },
            { key: "phone", label: "Phone", render: (row) => <span className="text-muted-foreground font-mono text-xs">{row.phone as string}</span> },
            {
              key: "visits", label: "Visits",
              render: (row) => (
                <div className="flex items-center gap-2">
                  <span className="font-editorial text-xl text-primary leading-none">{row.visits as number}</span>
                  {(row.vip as boolean) && (
                    <Badge variant="warning">
                      <Star className="w-2.5 h-2.5" />
                      VIP
                    </Badge>
                  )}
                </div>
              ),
            },
            { key: "lastVisit",  label: "Last Visit",   render: (row) => <span className="text-muted-foreground">{row.lastVisit as string}</span> },
            { key: "totalSpent", label: "Total Spent",   render: (row) => <span className="font-medium">{row.totalSpent as string}</span> },
            {
              key: "notes", label: "Notes",
              render: (row) => (
                <span className="text-muted-foreground text-xs max-w-[180px] truncate block">
                  {(row.notes as string) || "—"}
                </span>
              ),
            },
          ]}
          data={filtered}
          emptyMessage="No customers found"
        />
      </div>
    </div>
  );
}
