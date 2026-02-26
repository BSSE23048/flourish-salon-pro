import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface FormField {
  key: string;
  label: string;
  type?: "text" | "email" | "tel" | "number" | "select" | "textarea" | "date" | "time";
  placeholder?: string;
  options?: string[];
  required?: boolean;
  defaultValue?: string;
}

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: FormField[];
  onSubmit: (data: Record<string, string>) => void;
  submitLabel?: string;
}

export default function FormDialog({ open, onOpenChange, title, fields, onSubmit, submitLabel = "Save" }: FormDialogProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    fields.forEach((f) => { init[f.key] = f.defaultValue || ""; });
    return init;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
    // Reset
    const init: Record<string, string> = {};
    fields.forEach((f) => { init[f.key] = f.defaultValue || ""; });
    setValues(init);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{field.label}</label>
              {field.type === "select" ? (
                <Select value={values[field.key]} onValueChange={(v) => setValues({ ...values, [field.key]: v })}>
                  <SelectTrigger><SelectValue placeholder={field.placeholder || `Select ${field.label}`} /></SelectTrigger>
                  <SelectContent>
                    {field.options?.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "textarea" ? (
                <Textarea
                  value={values[field.key]}
                  onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              ) : (
                <Input
                  type={field.type || "text"}
                  value={values[field.key]}
                  onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{submitLabel}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
