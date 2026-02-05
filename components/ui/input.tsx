import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-zinc-500 selection:bg-primary selection:text-primary-foreground h-11 w-full min-w-0 rounded-md border border-white/10 px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none backdrop-blur-[8px] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-amber-500/50 focus-visible:shadow-[0_0_0_3px_rgba(245,158,11,0.15)]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      style={{ backgroundColor: 'rgba(26, 26, 36, 0.6)' }}
      {...props}
    />
  )
}

export { Input }
