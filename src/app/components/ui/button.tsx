/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[2px_2px_0px_rgba(0,0,0,0.1)] hover:shadow-[1px_1px_0px_rgba(0,0,0,0.1)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none border-2 border-border",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-2 border-border shadow-[2px_2px_0px_rgba(0,0,0,0.1)] hover:shadow-[1px_1px_0px_rgba(0,0,0,0.1)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        outline:
          "border-2 border-border bg-card text-foreground hover:bg-secondary hover:text-secondary-foreground shadow-[2px_2px_0px_rgba(0,0,0,0.1)] hover:shadow-[1px_1px_0px_rgba(0,0,0,0.1)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-2 border-border shadow-[2px_2px_0px_rgba(0,0,0,0.1)] hover:shadow-[1px_1px_0px_rgba(0,0,0,0.1)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        ghost: "hover:bg-secondary/30 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline font-bold",
        accent:
          "bg-accent text-accent-foreground hover:bg-accent/90 border-2 border-border shadow-[2px_2px_0px_rgba(0,0,0,0.1)] hover:shadow-[1px_1px_0px_rgba(0,0,0,0.1)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-md px-4 text-xs",
        lg: "h-14 rounded-lg px-10 text-base",
        icon: "size-11 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
    }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Button, buttonVariants };
