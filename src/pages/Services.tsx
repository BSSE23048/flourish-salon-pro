import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import FormDialog from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { API_URL } from "@/lib/api";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const categories = ["Hair", "Beard", "Grooming", "Skin", "Color", "Package"];

type Service = {
  id: string;
  name: string;
  category: string;
  price: number;
  durationMinutes: number;
  description: string;
  imageUrl: string;
};

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filtered = activeCategory === "All" ? services : services.filter((s) => s.category === activeCategory);

  const loadServices = async () => {
    const res = await fetch(`${API_URL}/api/services`, { headers: { "x-role": "admin" } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not load services");
    setServices(data);
  };

  useEffect(() => {
    loadServices().catch((error) => toast.error(error instanceof Error ? error.message : "Could not load services"));
  }, []);

  const toPayload = (data: Record<string, string>, existing?: Service | null) => ({
    name: data.name,
    category: data.category,
    price: Number(data.price),
    durationMinutes: Number(data.durationMinutes),
    description: data.description,
    imageUrl: data.imageUrl || existing?.imageUrl || "/Hero_sec.png",
  });

  const formFields = [
    { key: "name", label: "Service Name", required: true, placeholder: "e.g. Haircut & Blowdry" },
    { key: "category", label: "Category", type: "select" as const, options: categories, required: true },
    { key: "price", label: "Price (Rs.)", type: "number" as const, required: true, placeholder: "e.g. 1500" },
    { key: "durationMinutes", label: "Duration (minutes)", type: "number" as const, required: true, placeholder: "e.g. 45" },
    { key: "imageUrl", label: "Upload Picture", type: "file" as const, accept: "image/*" },
    { key: "description", label: "Description", type: "textarea" as const, placeholder: "Describe what clients get" },
  ];

  return (
    <div>
      <PageHeader
        title="Services"
        subtitle="Manage your salon service menu"
        actions={<Button onClick={() => setShowAdd(true)} disabled={loading}><Plus className="w-4 h-4 mr-2" />Add Service</Button>}
      />

      {/* Add */}
      <FormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title="Add Service"
        fields={formFields}
        onSubmit={async (data) => {
          setLoading(true);
          try {
            const res = await fetch(`${API_URL}/api/services`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-role": "admin" },
              body: JSON.stringify(toPayload(data)),
            });
            const service = await res.json();
            if (!res.ok) throw new Error(service.error || "Could not add service");
            setServices((current) => [...current, service]);
            toast.success(`Service "${data.name}" added!`);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not add service");
          } finally {
            setLoading(false);
          }
        }}
        submitLabel="Add Service"
      />

      {/* Edit */}
      {editService && (
        <FormDialog
          open={!!editService}
          onOpenChange={() => setEditService(null)}
          title="Edit Service"
          fields={formFields.map((f) => ({ ...f, defaultValue: f.type === "file" ? "" : String(editService[f.key as keyof Service] || "") }))}
          onSubmit={async (data) => {
            setLoading(true);
            try {
              const res = await fetch(`${API_URL}/api/services/${editService.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", "x-role": "admin" },
                body: JSON.stringify(toPayload(data, editService)),
              });
              const service = await res.json();
              if (!res.ok) throw new Error(service.error || "Could not update service");
              setServices((current) => current.map((s) => s.id === editService.id ? service : s));
              setEditService(null);
              toast.success(`Service "${data.name}" updated!`);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not update service");
            } finally {
              setLoading(false);
            }
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
              const removeService = async () => {
                const svc = services.find((s) => s.id === deleteId);
                try {
                  const res = await fetch(`${API_URL}/api/services/${deleteId}`, {
                    method: "DELETE",
                    headers: { "x-role": "admin" },
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Could not delete service");
                  setServices(services.filter((s) => s.id !== deleteId));
                  toast.success(`Service "${svc?.name}" deleted!`);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not delete service");
                } finally {
                  setDeleteId(null);
                }
              };
              removeService();
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
          <div key={service.id} className="bg-card overflow-hidden rounded-xl border border-border shadow-card hover:shadow-card-hover transition-shadow">
            <div className="h-40 bg-muted">
              <img
                src={service.imageUrl || "/Hero_sec.png"}
                alt=""
                className="h-full w-full object-cover"
                onError={(event) => { event.currentTarget.src = "/Hero_sec.png"; }}
              />
            </div>
            <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent text-accent-foreground">{service.category}</span>
              <div className="flex gap-1">
                <button disabled={loading} onClick={() => setEditService(service)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"><Pencil className="w-3.5 h-3.5" /></button>
                <button disabled={loading} onClick={() => setDeleteId(service.id)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <h3 className="font-semibold text-foreground mb-2">{service.name}</h3>
            <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{service.description || "Premium salon service"}</p>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-primary">Rs. {Number(service.price).toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">{service.durationMinutes} min</span>
            </div>
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
