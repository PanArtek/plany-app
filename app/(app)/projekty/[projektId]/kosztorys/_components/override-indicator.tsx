'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface OverrideIndicatorProps {
  isOverridden: boolean
  libraryValue: number
  onReset: () => void
  disabled?: boolean
}

export function OverrideIndicator({
  isOverridden,
  libraryValue,
  onReset,
  disabled,
}: OverrideIndicatorProps) {
  if (!isOverridden) return null

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={disabled ? undefined : onReset}
            className={`text-amber-500 text-xs inline-flex items-center ml-1 ${
              disabled
                ? 'cursor-default opacity-60'
                : 'hover:text-amber-400 cursor-pointer'
            }`}
            disabled={disabled}
          >
            ●
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Resetuj do wartości z biblioteki ({libraryValue.toFixed(2)})</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
