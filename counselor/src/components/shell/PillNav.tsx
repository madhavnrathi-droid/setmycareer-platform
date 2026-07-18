import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"

/* Top pill-nav (REF-A): the facets of the current object. Active pill = brand-100
   fill + foreground text. Thin, rounded-full, horizontal scroll on mobile. */
export interface PillItem {
  to: string
  label: string
  end?: boolean
  disabled?: boolean
  hint?: string
}

export function PillNav({ items }: { items: PillItem[] }) {
  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((it) =>
          it.disabled ? (
            <span
              key={it.to}
              title={it.hint}
              aria-disabled
              className="shrink-0 cursor-not-allowed rounded-full px-3.5 h-8 inline-flex items-center text-[13px] text-ink-300"
            >
              {it.label}
            </span>
          ) : (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                cn(
                  "shrink-0 rounded-full px-3.5 h-8 inline-flex items-center gap-2 text-[13px] transition-colors",
                  isActive
                    ? "bg-brand-100 text-brand-600 font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )
              }
            >
              {it.label}
            </NavLink>
          ),
        )}
      </div>
    </div>
  )
}
