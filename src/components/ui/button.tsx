import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium",
    "ring-offset-background transition-all duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:stroke-[1.5]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/88 active:scale-[0.98] shadow-sm",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/88 active:scale-[0.98] shadow-sm",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-muted hover:border-border/80 active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70 active:scale-[0.98]",
        ghost:
          "text-foreground hover:bg-muted active:scale-[0.98]",
        sage:
          "bg-accent text-accent-foreground hover:bg-accent/80 active:scale-[0.98]",
        link:
          "text-primary underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm:      "h-9 rounded-full px-4 text-sm [&_svg]:size-3.5",
        default: "h-11 rounded-full px-5 text-sm [&_svg]:size-4",
        lg:      "h-13 rounded-full px-7 text-base [&_svg]:size-4.5",
        xl:      "h-14 rounded-full px-8 text-base [&_svg]:size-5",
        icon:    "h-9 w-9 rounded-full [&_svg]:size-4",
        "icon-sm": "h-8 w-8 rounded-full [&_svg]:size-3.5",
        "icon-lg": "h-11 w-11 rounded-full [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
