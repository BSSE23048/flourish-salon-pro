import { useState } from "react";
import { Plus, Receipt, Download, CreditCard, Banknote, Smartphone } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";

const invoices = [
  { id: "#INV-1042", date: "2026-02-26", customer: "Ayesha Khan", services: "Haircut, Blowdry", total: "Rs. 3,500", payment: "Cash", status: "Paid" },
  { id: "#INV-1041", date: "2026-02-26", customer: "Fatima Ali", services: "Facial Treatment", total: "Rs. 4,500", payment: "Card", status: "Paid" },
  { id: "#INV-1040", date: "2026-02-25", customer: "Zainab Raza", services: "Manicure, Pedicure, Gel", total: "Rs. 5,500", payment: "JazzCash", status: "Paid" },
  { id: "#INV-1039", date: "2026-02-25", customer: "Mehak Tariq", services: "Hair Color", total: "Rs. 4,000", payment: "Easypaisa", status: "Paid" },
  { id: "#INV-1038", date: "2026-02-24", customer: "Sana Malik", services: "Bridal Makeup", total: "Rs. 15,000", payment: "Card", status: "Paid" },
  { id: "#INV-1037", date: "2026-02-24", customer: "Rabia Noor", services: "Threading, Facial", total: "Rs. 3,000", payment: "Cash", status: "Pending" },
];

const paymentIcons: Record<string, React.ReactNode> = {
  Cash: <Banknote className="w-3.5 h-3.5" />,
  Card: <CreditCard className="w-3.5 h-3.5" />,
  JazzCash: <Smartphone className="w-3.5 h-3.5" />,
  Easypaisa: <Smartphone className="w-3.5 h-3.5" />,
};

export default function Billing() {
  return (
    <div>
      <PageHeader
        title="Billing & Invoices"
        subtitle="Manage payments and generate invoices"
        actions={
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Invoice
          </Button>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Today's Sales", value: "Rs. 8,000", sub: "2 invoices" },
          { label: "This Week", value: "Rs. 35,500", sub: "6 invoices" },
          { label: "Cash", value: "Rs. 6,500", sub: "2 transactions" },
          { label: "Digital", value: "Rs. 29,000", sub: "4 transactions" },
        ].map((s, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4 shadow-card">
            <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold text-foreground mt-1">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Invoice History
          </h3>
        </div>
        <DataTable
          columns={[
            { key: "id", label: "Invoice", render: (row) => <span className="font-mono text-xs font-medium">{row.id}</span> },
            { key: "date", label: "Date" },
            { key: "customer", label: "Customer", render: (row) => <span className="font-medium">{row.customer}</span> },
            { key: "services", label: "Services" },
            { key: "total", label: "Total", render: (row) => <span className="font-semibold text-foreground">{row.total}</span> },
            {
              key: "payment",
              label: "Payment",
              render: (row) => (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  {paymentIcons[row.payment]} {row.payment}
                </span>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  row.status === "Paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                }`}>
                  {row.status}
                </span>
              ),
            },
            {
              key: "actions",
              label: "",
              render: () => (
                <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              ),
            },
          ]}
          data={invoices}
        />
      </div>
    </div>
  );
}
