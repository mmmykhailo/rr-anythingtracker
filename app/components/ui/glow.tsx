import { cva, type VariantProps } from "class-variance-authority";
import React from "react";

import { cn } from "~/lib/utils";

const glowVariants = cva("absolute w-full", {
  variants: {
    variant: {
      manual: "",
      top: "top-0",
      above: "-top-[128px]",
      bottom: "bottom-0",
      below: "-bottom-[128px]",
      center: "top-[50%]",
    },
  },
  defaultVariants: {
    variant: "manual",
  },
});

function Glow({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof glowVariants>) {
  return (
    <div
      data-slot="glow"
      className={cn(glowVariants({ variant }), className)}
      {...props}
    >
      <div
        className={cn(
          "from-foreground/10 to-foreground/0 absolute left-1/2 h-full w-3/4 -translate-x-1/2 scale-[2.5] rounded-[50%] bg-radial from-10% to-60% opacity-20 dark:opacity-100",
          variant === "center" && "-translate-y-1/2"
        )}
      />
      <div
        className={cn(
          "from-foreground/10 to-foreground/0 absolute left-1/2 h-full w-3/4 -translate-x-1/2 scale-200 rounded-[50%] bg-radial from-10% to-60% opacity-20 dark:opacity-100",
          variant === "center" && "-translate-y-1/2"
        )}
      />
    </div>
  );
}

export default Glow;
