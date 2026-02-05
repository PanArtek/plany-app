"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Dialog as SheetPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const VARIANTS = {
  default: "w-full md:w-[600px]",
  narrow: "w-full md:w-[400px]",
  wide: "w-full md:w-[800px]",
} as const

type SlidePanelVariant = keyof typeof VARIANTS

interface SlidePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  variant?: SlidePanelVariant
}

function SlidePanel({
  open,
  onOpenChange,
  children,
  variant = "default",
}: SlidePanelProps) {
  return (
    <SheetPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <SheetPrimitive.Portal>
        {/* Transparent overlay - allows clicking outside to close */}
        <SheetPrimitive.Overlay
          className="fixed inset-0 z-50 bg-transparent data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <SheetPrimitive.Content
          className={cn(
            // Position & layout
            "fixed inset-y-0 right-0 z-50 h-full flex flex-col",
            // Minimalist Dark styling
            "bg-[#0A0A0F] border-l border-white/[0.08]",
            // Shadow
            "shadow-[-20px_0_60px_rgba(0,0,0,0.5)]",
            // Animation - slide from right, 300ms
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            "data-[state=open]:duration-300 data-[state=closed]:duration-300",
            "ease-out",
            // Mobile fullscreen - no border-radius, full width
            "rounded-none md:rounded-l-xl",
            // Mobile: remove left border (fullscreen)
            "border-l-0 md:border-l",
            // Width variant (includes mobile w-full)
            VARIANTS[variant]
          )}
        >
          {children}
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  )
}

interface SlidePanelHeaderProps {
  children: React.ReactNode
  onClose?: () => void
  className?: string
}

function SlidePanelHeader({
  children,
  onClose,
  className,
}: SlidePanelHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-6 py-4",
        "border-b border-white/5",
        className
      )}
    >
      <div className="flex-1">{children}</div>
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/5"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Zamknij</span>
        </Button>
      )}
    </div>
  )
}

interface SlidePanelTitleProps {
  children: React.ReactNode
  className?: string
}

function SlidePanelTitle({ children, className }: SlidePanelTitleProps) {
  return (
    <SheetPrimitive.Title
      className={cn("text-lg font-semibold text-white", className)}
    >
      {children}
    </SheetPrimitive.Title>
  )
}

interface SlidePanelDescriptionProps {
  children: React.ReactNode
  className?: string
}

function SlidePanelDescription({
  children,
  className,
}: SlidePanelDescriptionProps) {
  return (
    <SheetPrimitive.Description
      className={cn("text-sm text-white/60", className)}
    >
      {children}
    </SheetPrimitive.Description>
  )
}

interface SlidePanelContentProps {
  children: React.ReactNode
  className?: string
}

function SlidePanelContent({ children, className }: SlidePanelContentProps) {
  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto px-6 py-4",
        className
      )}
    >
      {children}
    </div>
  )
}

interface SlidePanelFooterProps {
  children: React.ReactNode
  className?: string
}

function SlidePanelFooter({ children, className }: SlidePanelFooterProps) {
  return (
    <div
      className={cn(
        "sticky bottom-0 px-6 py-4",
        "border-t border-white/5",
        "bg-[#0A0A0F]",
        className
      )}
    >
      {children}
    </div>
  )
}

export {
  SlidePanel,
  SlidePanelHeader,
  SlidePanelTitle,
  SlidePanelDescription,
  SlidePanelContent,
  SlidePanelFooter,
}
export type { SlidePanelVariant }
