import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center font-mono rounded-sm border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-green-500/10 text-green-600",
        secondary:
          "border-transparent bg-zinc-100 text-zinc-800",
        destructive:
          "border-transparent bg-red-500/10 text-red-600",
        outline: "text-foreground",
        success:
          "border-transparent bg-green-500/10 text-green-600",
        warning:
          "border-transparent bg-yellow-500/10 text-yellow-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
