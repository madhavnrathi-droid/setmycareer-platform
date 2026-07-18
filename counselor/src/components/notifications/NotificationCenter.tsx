import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Bell, X, ClipboardCheck, Clock, UserPlus, MessageCircle, TriangleAlert, FileText,
} from "lucide-react"
import { toast } from "sonner"
import {
  useNotifications, markRead, markAllRead,
  type AppNotification, type NotifKind, type NotifAction,
} from "@/lib/notifications"
import { cn } from "@/lib/utils"

const KIND_ICON: Record<NotifKind, { icon: React.ElementType; tone: string }> = {
  review: { icon: ClipboardCheck, tone: "bg-brand-100 text-brand-600" },
  reminder: { icon: Clock, tone: "bg-warn-100 text-warn-600" },
  new_client: { icon: UserPlus, tone: "bg-well-100 text-well-600" },
  question: { icon: MessageCircle, tone: "bg-secondary text-ink-600" },
  contradiction: { icon: TriangleAlert, tone: "bg-risk-100 text-risk-600" },
  report: { icon: FileText, tone: "bg-secondary text-ink-600" },
}

function KindIcon({ kind }: { kind: NotifKind }) {
  const { icon: Icon, tone } = KIND_ICON[kind]
  return (
    <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg", tone)}>
      <Icon className="size-4 stroke-[1.5]" />
    </span>
  )
}

/* Bell → hover overview + click opens a left detail drawer with actions. */
export function NotificationCenter() {
  const items = useNotifications()
  const unread = items.filter((n) => n.unread).length
  const [hover, setHover] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const nav = useNavigate()

  // Esc closes the drawer so it can never get "stuck" open
  useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawer(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [drawer])

  function runAction(n: AppNotification, a: NotifAction) {
    markRead(n.id)
    if ((a.id === "open" || a.id === "schedule" || a.id === "review" || a.id === "join" || a.id === "view") && n.clientId) {
      nav(`/clients/${n.clientId}`)
      setDrawer(false)
      setHover(false)
    } else {
      toast(`${a.label}…`)
    }
  }

  return (
    <>
      <div className="relative" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        <button
          aria-label="Notifications"
          onClick={() => { setHover(false); setDrawer(true) }}
          className="relative grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary"
        >
          <Bell className="size-[18px] stroke-[1.5]" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-500 px-1 text-[9px] font-medium leading-none tabular-nums text-white">
              {unread}
            </span>
          )}
        </button>

        {/* hover overview */}
        {hover && (
          <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-hairline bg-[var(--surface-frost-strong)] shadow-[var(--shadow-float)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-hairline px-3 py-2">
              <span className="text-[12px] font-medium">Notifications</span>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-[11px] font-medium text-brand-600 hover:underline">Mark all read</button>
              )}
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {items.slice(0, 5).map((n) => (
                <button
                  key={n.id}
                  onClick={() => { setHover(false); setDrawer(true) }}
                  className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-secondary/70"
                >
                  <KindIcon kind={n.kind} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[12.5px] font-medium">{n.title}</span>
                      {n.unread && <span className="size-1.5 shrink-0 rounded-full bg-brand-500" />}
                    </div>
                    <div className="truncate text-[11.5px] text-muted-foreground">{n.text}</div>
                    <div className="mt-0.5 text-[10.5px] text-ink-300">{n.time}</div>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => { setHover(false); setDrawer(true) }}
              className="w-full border-t border-hairline px-3 py-2 text-center text-[12px] font-medium text-brand-600 transition-colors hover:bg-secondary/70"
            >
              Open inbox →
            </button>
          </div>
        )}
      </div>

      {/* left detail drawer */}
      <div className={cn("fixed inset-0 z-[70]", !drawer && "pointer-events-none")} aria-hidden={!drawer}>
        <div
          className={cn("absolute inset-0 bg-foreground/20 backdrop-blur-sm transition-opacity duration-300", drawer ? "opacity-100" : "opacity-0")}
          onClick={() => setDrawer(false)}
        />
        <aside
          role="dialog"
          aria-label="Notifications"
          className={cn(
            "absolute right-0 top-0 flex h-svh w-[380px] max-w-[88vw] flex-col bg-card shadow-[var(--shadow-float)] transition-transform duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none",
            drawer ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
            <div>
              <h2 className="font-display text-[18px] font-light tracking-tight">Notifications</h2>
              <p className="text-[11.5px] text-muted-foreground">{unread} unread · {items.length} total</p>
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button onClick={markAllRead} className="rounded-md px-2 h-7 text-[11.5px] text-muted-foreground transition-colors hover:bg-secondary">Mark all read</button>
              )}
              <button onClick={() => setDrawer(false)} aria-label="Close" className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary">
                <X className="size-4 stroke-[1.5]" />
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            {items.map((n) => (
              <div
                key={n.id}
                className={cn("rounded-2xl p-3.5 shadow-[var(--shadow-e1)]", n.unread ? "bg-card ring-1 ring-brand-500/20" : "bg-secondary/40")}
              >
                <div className="flex items-start gap-2.5">
                  <KindIcon kind={n.kind} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium">{n.title}</span>
                      {n.unread && <span className="size-1.5 shrink-0 rounded-full bg-brand-500" />}
                      <span className="ml-auto shrink-0 text-[10.5px] tabular-nums text-ink-300">{n.time}</span>
                    </div>
                    <p className="mt-1 text-[12px] leading-snug text-ink-600">{n.text}</p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {n.actions.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => runAction(n, a)}
                          className={cn(
                            "inline-flex h-7 items-center rounded-lg px-2.5 text-[11.5px] font-medium transition-colors",
                            a.tone === "brand" ? "bg-foreground text-background hover:opacity-90" : "border border-border text-ink-600 hover:bg-secondary",
                          )}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  )
}
