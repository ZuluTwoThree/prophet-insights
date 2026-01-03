import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Prophet-specific variants
        prophet: "border-primary/30 bg-primary/10 text-primary",
        prophetSuccess: "border-prophet-success/30 bg-prophet-success/10 text-prophet-success",
        prophetWarning: "border-prophet-warning/30 bg-prophet-warning/10 text-prophet-warning",
        prophetDanger: "border-prophet-danger/30 bg-prophet-danger/10 text-prophet-danger",
        prophetInfo: "border-prophet-info/30 bg-prophet-info/10 text-prophet-info",
        accelerating: "border-prophet-success/40 bg-prophet-success/15 text-prophet-success font-mono",
        stable: "border-prophet-info/40 bg-prophet-info/15 text-prophet-info font-mono",
        decelerating: "border-prophet-warning/40 bg-prophet-warning/15 text-prophet-warning font-mono",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
