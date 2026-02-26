import { useState } from "react";
import { Plus, AlertTriangle, Search } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import FormDialog from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const initialProducts = [
  { id: 1, name: "L'Oreal Hair Serum", category: "Hair Care", stock: 3, price: "1200", usage: 45 },
  { id: 2, name: "Kerastase Shampoo", category: "Hair Care", stock: 12, price: "2500", usage: 28 },
  { id: 3, name: "Facial Cleanser (Dermalogica)", category: "Skin Care", stock: 8, price: "1800", usage: 32 },
  { id: 4, name: "OPI Nail Polish Set", category: "Nails", stock: 25, price: "800", usage: 67 },
  { id: 5, name: "Hair Color (Wella)", category: "Hair Color", stock: 5, price: "900", usage: 52 },
  { id: 6, name: "Makeup Primer (MAC)", category: "Makeup", stock: 15, price: "3200", usage: 18 },
  { id: 7, name: "Wax Strips", category: "Consumables", stock: 2, price: "400", usage: 89 },
  { id: 8, name: "Cotton Pads (500pc)", category: "Consumables", stock: 40, price: "300", usage: 120 },
];

export default function Inventory() {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const lowStockCount = products.filter((p) => p.stock <= 5).length;
  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Track products and stock levels"
        actions={<Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-2" />Add Product</Button>}
      />

      <FormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title="Add Product"
        fields={[
          { key: "name", label: "Product Name", required: true, placeholder: "e.g. L'Oreal Hair Serum" },
          { key: "category", label: "Category", type: "select", options: ["Hair Care", "Skin Care", "Nails", "Hair Color", "Makeup", "Consumables"], required: true },
          { key: "stock", label: "Stock Quantity", type: "number", required: true, placeholder: "e.g. 10" },
          { key: "price", label: "Unit Price (Rs.)", type: "number", required: true, placeholder: "e.g. 1200" },
        ]}
        onSubmit={(data) => {
          setProducts([{ id: Date.now(), name: data.name, category: data.category, stock: Number(data.stock), price: data.price, usage: 0 }, ...products]);
          toast.success(`Product "${data.name}" added to inventory!`);
        }}
        submitLabel="Add Product"
      />

      {lowStockCount > 0 && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
          <p className="text-sm text-foreground"><span className="font-semibold">{lowStockCount} products</span> are running low on stock.</p>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border shadow-card">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
        <DataTable
          columns={[
            { key: "name", label: "Product", render: (row) => <span className="font-medium">{row.name}</span> },
            { key: "category", label: "Category" },
            { key: "stock", label: "Stock", render: (row) => <span className={`font-semibold ${row.stock <= 5 ? "text-destructive" : "text-foreground"}`}>{row.stock} {row.stock <= 5 && <AlertTriangle className="w-3 h-3 inline ml-1" />}</span> },
            { key: "price", label: "Unit Price", render: (row) => `Rs. ${Number(row.price).toLocaleString()}` },
            { key: "usage", label: "Used (Monthly)", render: (row) => <span className="text-muted-foreground">{row.usage} units</span> },
          ]}
          data={filtered}
        />
      </div>
    </div>
  );
}
