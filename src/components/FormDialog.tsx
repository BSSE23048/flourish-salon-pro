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
  hint?: string;
}

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FormField[];
  onSubmit: (data: Record<string, string>) => void;
  submitLabel?: string;
}

export default function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  onSubmit,
  submitLabel = "Save",
}: FormDialogProps) {
  const initialValues = useMemo(() => {
    const init: Record<string, string> = {};
    fields.forEach((f) => { init[f.key] = f.defaultValue || ""; });
    return init;
  }, [fields]);

  const [values, setValues] = useState<Record<string, string>>(initialValues);

  useEffect(() => {
    if (open) setValues(initialValues);
  }, [initialValues, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
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

  const set = (key: string, val: string) => setValues((v) => ({ ...v, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-hidden sm:max-w-xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="font-editorial text-2xl font-normal text-foreground tracking-tight">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </DialogDescription>
          ) : (
            <DialogDescription className="sr-only">
              Complete the form and submit to save changes.
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-1 max-h-[calc(90vh-11rem)] space-y-5 overflow-y-auto pr-1">
          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <label className="text-sm font-medium text-foreground block leading-none">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </label>

              {field.type === "select" ? (
                <Select value={values[field.key]} onValueChange={(v) => set(field.key, v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "textarea" ? (
                <Textarea
                  value={values[field.key]}
                  onChange={(e) => set(field.key, e.target.value)}
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
                    <img
                      src={values[field.key]}
                      alt=""
                      className="h-28 w-full rounded-xl border object-cover"
                    />
                  )}
                </div>
              ) : (
                <Input
                  type={field.type || "text"}
                  value={values[field.key]}
                  onChange={(e) => set(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              )}

              {field.hint && (
                <p className="text-xs text-muted-foreground">{field.hint}</p>
              )}
            </div>
          ))}

          {/* Sticky footer */}
          <div className="sticky bottom-0 -mx-1 flex justify-end gap-2 bg-popover/95 px-1 pb-1 pt-4 backdrop-blur border-t border-border mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">{submitLabel}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
