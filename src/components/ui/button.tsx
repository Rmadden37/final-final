import * as React from "react";
import {Slot} from "@radix-ui/react-slot";
import {cva, type VariantProps} from "class-variance-authority";

import {cn} from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation select-none",
  {
    variants: {
      variant: {
        "default": "text-primary-foreground bg-gradient-to-r from-[hsl(var(--primary-gradient-from))] to-[hsl(var(--primary-gradient-to))] hover:from-[hsl(var(--primary-gradient-to))] hover:to-[hsl(var(--primary-gradient-from))] shadow-md hover:shadow-lg active:scale-95",
        "destructive":
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md hover:shadow-lg active:scale-95",
        "outline":
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm hover:shadow-md active:scale-95",
        "secondary":
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md active:scale-95",
        "ghost": "hover:bg-accent hover:text-accent-foreground active:scale-95",
        "link": "text-primary underline-offset-4 hover:underline",
        "primary-solid": "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg active:scale-95",
      },
      size: {
        default: "h-10 px-4 py-2 min-h-touch mobile:h-12 mobile:px-6 mobile:text-base",
        sm: "h-9 rounded-md px-3 min-h-touch mobile:h-10 mobile:px-4",
        lg: "h-11 rounded-md px-8 min-h-touch mobile:h-14 mobile:px-10 mobile:text-lg",
        icon: "h-10 w-10 min-h-touch min-w-touch mobile:h-12 mobile:w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({className, variant, size, asChild = false, ...props}, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({variant, size, className}))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export {Button, buttonVariants};
