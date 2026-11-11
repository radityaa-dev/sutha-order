import * as React from "react"
import { LucideIcon } from "lucide-react"
import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { MoreHorizontal, Loader2 } from "lucide-react"
import { cn } from "cn"

interface ActionItem {
  label: string
  icon: LucideIcon
  onClick: () => void
  destructive?: boolean
  disabled?: boolean
}

interface RowActionsProps {
  primary?: {
    label: string
    icon: LucideIcon
    onClick: () => void
    disabled?: boolean
    loading?: boolean
    variant?: "default" | "outline"
  }
  items?: ActionItem[]
}

export function RowActions({ primary, items = [] }: RowActionsProps) {
  const PrimaryIcon = primary?.icon

  return (
    <div className="flex flex-row items-center justify-end gap-2 whitespace-nowrap">
      {primary && (
        <Button
          size="sm"
          variant={primary.variant || "outline"}
          onClick={primary.onClick}
          disabled={primary.disabled || primary.loading}
        >
          {primary.loading ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            PrimaryIcon && <PrimaryIcon className="mr-1.5 h-4 w-4" />
          )}
          {primary.label}
        </Button>
      )}
      
      {items.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Aksi lainnya">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            {items.map((item, index) => {
              const Icon = item.icon
              return (
                <React.Fragment key={index}>
                  {item.destructive && index > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    onClick={item.onClick}
                    disabled={item.disabled}
                    className={cn(
                      "flex items-center gap-2", // Pastikan ini horizontal untuk ikon + teks
                      item.destructive && "text-destructive focus:text-destructive"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </DropdownMenuItem>
                  {item.destructive && index < items.length - 1 && <DropdownMenuSeparator />}
                </React.Fragment>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
