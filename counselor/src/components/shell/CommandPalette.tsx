import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { LayoutDashboard, Users, CalendarDays, FileText } from "lucide-react"
import { useCaseloadClients } from "@/lib/caseload"
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator,
} from "@/components/ui/command"

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/reports", label: "Reports", icon: FileText },
]

/** Self-contained ⌘K command palette: owns its open state + global keydown.
 *  Jumps to a client, the dashboard, calendar, or reports. (Shell wiring is the
 *  Integrate phase's job — this component is drop-in.) */
export function CommandPalette() {
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const { clients } = useCaseloadClients()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    // the topbar search pill opens the palette too (same surface as ⌘K)
    const onOpen = () => setOpen(true)
    document.addEventListener("keydown", onKey)
    window.addEventListener("smc:palette", onOpen)
    return () => { document.removeEventListener("keydown", onKey); window.removeEventListener("smc:palette", onOpen) }
  }, [])

  const go = (to: string) => {
    setOpen(false)
    nav(to)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Command palette" description="Jump to a client or section">
      <CommandInput placeholder="Search clients, sections…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Go to">
          {NAV.map((it) => (
            <CommandItem
              key={it.to}
              value={`go ${it.label}`}
              onSelect={() => go(it.to)}
            >
              <it.icon className="stroke-[1.5]" />
              <span>{it.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        {clients.length > 0 && (
          <CommandGroup heading="Clients">
            {clients.map((c) => (
              <CommandItem
                key={c.id}
                value={`client ${c.name} ${c.packages.join(" ")}`}
                onSelect={() => go(`/clients/${c.id}`)}
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink-100 text-[10px] font-medium text-ink-700">
                  {c.initials}
                </span>
                <span>{c.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
