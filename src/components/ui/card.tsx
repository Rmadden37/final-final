import * as React from "react"

import { cn } from "@/lib/utils"

/* eslint-disable no-undef */

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => (
  <div
    ref={ref}
    data-card="true"
    className={cn(
      // Light mode: Clean white cards with proper shadows and borders
      "rounded-2xl overflow-hidden border border-slate-200 bg-white text-card-foreground",
      "shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-slate-300/50",
      "transition-all duration-200 ease-in-out",
      // Mobile optimizations
      "mobile:rounded-xl mobile:mx-2 mobile:shadow-md",
      "mobile:border-slate-300/50",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 p-6",
      "mobile:p-4 mobile:space-y-1",
      className
    )}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({className, ...props}, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-3xl font-bold font-headline leading-tight tracking-tight text-center",
      "mobile:text-xl mobile:leading-snug",
      "tablet:text-2xl",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({className, ...props}, ref) => (
  <p // Changed from div for semantic correctness
    ref={ref}
    className={cn(
      "text-sm text-muted-foreground text-center",
      "mobile:text-xs mobile:leading-relaxed",
      className
    )} // Added text-center for consistency if needed
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent};
