import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useMemo, useState } from "react";

interface FormField {
  key: string;
  label: string;
  type?: "text" | "email" | "tel" | "number" | "select" | "textarea" | "date" | "time" | "url" | "file";
  placeholder?: string;
  options?: string[];
  required?: boolean;
  defaultValue?: string;
  accept?: string;
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
  const initialValues = useMemo(() => {
    const init: Record<string, string> = {};
    fields.forEach((f) => { init[f.key] = f.defaultValue || ""; });
    return init;
  }, [fields]);

  const [values, setValues] = useState<Record<string, string>>(initialValues);

  useEffect(() => {
    if (open) {
      setValues(initialValues);
    }
  }, [initialValues, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
    // Reset
    setValues(initialValues);
    onOpenChange(false);
  };

  const handleFileChange = (fieldKey: string, file: File | undefined) => {
    if (!file) {
      setValues({ ...values, [fieldKey]: "" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setValues((current) => ({ ...current, [fieldKey]: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Complete the form fields and submit to save changes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 max-h-[calc(90vh-9rem)] space-y-4 overflow-y-auto pr-1">
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
              ) : field.type === "file" ? (
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept={field.accept}
                    onChange={(e) => handleFileChange(field.key, e.target.files?.[0])}
                    required={field.required && !values[field.key]}
                  />
                  {values[field.key] && (
                    <img src={values[field.key]} alt="" className="h-28 w-full rounded-md border object-cover" />
                  )}
                </div>
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
          <div className="sticky bottom-0 -mx-1 flex justify-end gap-2 bg-background/95 px-1 pb-1 pt-3 backdrop-blur">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{submitLabel}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
