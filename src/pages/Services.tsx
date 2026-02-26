import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

const categories = ["Hair", "Skin", "Nails", "Makeup", "Spa"];

const services = [
  { id: 1, name: "Haircut & Blowdry", category: "Hair", price: "Rs. 1,500", duration: "45 min" },
  { id: 2, name: "Hair Color (Full)", category: "Hair", price: "Rs. 4,000", duration: "120 min" },
  { id: 3, name: "Hair Spa Treatment", category: "Spa", price: "Rs. 3,000", duration: "60 min" },
  { id: 4, name: "Facial (Gold)", category: "Skin", price: "Rs. 2,500", duration: "60 min" },
  { id: 5, name: "Facial (Diamond)", category: "Skin", price: "Rs. 4,500", duration: "75 min" },
  { id: 6, name: "Manicure & Pedicure", category: "Nails", price: "Rs. 2,000", duration: "60 min" },
  { id: 7, name: "Gel Nails", category: "Nails", price: "Rs. 3,500", duration: "90 min" },
  { id: 8, name: "Bridal Makeup", category: "Makeup", price: "Rs. 15,000", duration: "180 min" },
  { id: 9, name: "Party Makeup", category: "Makeup", price: "Rs. 5,000", duration: "90 min" },
  { id: 10, name: "Threading (Full Face)", category: "Skin", price: "Rs. 500", duration: "20 min" },
];

export default function Services() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = activeCategory === "All" ? services : services.filter((s) => s.category === activeCategory);

  return (
    <div>
      <PageHeader
        title="Services"
        subtitle="Manage your salon service menu"
        actions={
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Service
          </Button>
        }
      />

      {/* Category tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {["All", ...categories].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((service) => (
          <div key={service.id} className="bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-card-hover transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent text-accent-foreground">
                {service.category}
              </span>
              <div className="flex gap-1">
                <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <h3 className="font-semibold text-foreground mb-2">{service.name}</h3>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-primary">{service.price}</span>
              <span className="text-xs text-muted-foreground">{service.duration}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
