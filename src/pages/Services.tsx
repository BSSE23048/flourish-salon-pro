import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import FormDialog from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const categories = ["Hair", "Skin", "Nails", "Makeup", "Spa"];

const initialServices = [
  { id: 1, name: "Haircut & Blowdry", category: "Hair", price: "1500", duration: "45" },
  { id: 2, name: "Hair Color (Full)", category: "Hair", price: "4000", duration: "120" },
  { id: 3, name: "Hair Spa Treatment", category: "Spa", price: "3000", duration: "60" },
  { id: 4, name: "Facial (Gold)", category: "Skin", price: "2500", duration: "60" },
  { id: 5, name: "Facial (Diamond)", category: "Skin", price: "4500", duration: "75" },
  { id: 6, name: "Manicure & Pedicure", category: "Nails", price: "2000", duration: "60" },
  { id: 7, name: "Gel Nails", category: "Nails", price: "3500", duration: "90" },
  { id: 8, name: "Bridal Makeup", category: "Makeup", price: "15000", duration: "180" },
  { id: 9, name: "Party Makeup", category: "Makeup", price: "5000", duration: "90" },
  { id: 10, name: "Threading (Full Face)", category: "Skin", price: "500", duration: "20" },
];

export default function Services() {
  const [services, setServices] = useState(initialServices);
  const [activeCategory, setActiveCategory] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [editService, setEditService] = useState<typeof initialServices[0] | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const filtered = activeCategory === "All" ? services : services.filter((s) => s.category === activeCategory);

  const formFields = [
    { key: "name", label: "Service Name", required: true, placeholder: "e.g. Haircut & Blowdry" },
    { key: "category", label: "Category", type: "select" as const, options: categories, required: true },
    { key: "price", label: "Price (Rs.)", type: "number" as const, required: true, placeholder: "e.g. 1500" },
    { key: "duration", label: "Duration (minutes)", type: "number" as const, required: true, placeholder: "e.g. 45" },
  ];

  return (
    <div>
      <PageHeader
        title="Services"
        subtitle="Manage your salon service menu"
        actions={<Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-2" />Add Service</Button>}
      />

      {/* Add */}
      <FormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title="Add Service"
        fields={formFields}
        onSubmit={(data) => {
          setServices([...services, { id: Date.now(), name: data.name, category: data.category, price: data.price, duration: data.duration }]);
          toast.success(`Service "${data.name}" added!`);
        }}
        submitLabel="Add Service"
      />

      {/* Edit */}
      {editService && (
        <FormDialog
          open={!!editService}
          onOpenChange={() => setEditService(null)}
          title="Edit Service"
          fields={formFields.map((f) => ({ ...f, defaultValue: (editService as any)[f.key] || "" }))}
          onSubmit={(data) => {
            setServices(services.map((s) => s.id === editService.id ? { ...s, name: data.name, category: data.category, price: data.price, duration: data.duration } : s));
            setEditService(null);
            toast.success(`Service "${data.name}" updated!`);
          }}
          submitLabel="Save Changes"
        />
      )}

      {/* Delete Confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this service? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              const svc = services.find((s) => s.id === deleteId);
              setServices(services.filter((s) => s.id !== deleteId));
              setDeleteId(null);
              toast.success(`Service "${svc?.name}" deleted!`);
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {["All", ...categories].map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{cat}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((service) => (
          <div key={service.id} className="bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-card-hover transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent text-accent-foreground">{service.category}</span>
              <div className="flex gap-1">
                <button onClick={() => setEditService(service)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteId(service.id)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <h3 className="font-semibold text-foreground mb-2">{service.name}</h3>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-primary">Rs. {Number(service.price).toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">{service.duration} min</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground text-sm">No services in this category</div>
        )}
      </div>
    </div>
  );
}
