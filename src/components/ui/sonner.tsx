import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: [
            "group toast",
            "group-[.toaster]:bg-card group-[.toaster]:text-foreground",
            "group-[.toaster]:border group-[.toaster]:border-border",
            "group-[.toaster]:rounded-2xl group-[.toaster]:shadow-lift",
            "group-[.toaster]:font-sans",
          ].join(" "),
          title: "group-[.toast]:text-sm group-[.toast]:font-medium group-[.toast]:text-foreground",
          description: "group-[.toast]:text-xs group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-full",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-full",
          success: "group-[.toaster]:border-success/20",
          error: "group-[.toaster]:border-destructive/20",
          warning: "group-[.toaster]:border-warning/20",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
