import { useState } from "react"
import { Video, Check, Plus, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { useMe } from "@/lib/me"
import { useGsap, revealChildren } from "@/lib/gsap"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { useAppearance } from "@/lib/appearance"
import { cn } from "@/lib/utils"

type Integration = { id: string; name: string; desc: string; connected: boolean }

const INITIAL_INTEGRATIONS: Integration[] = [
  { id: "google_meet", name: "Google Meet", desc: "Auto-join + record scheduled sessions", connected: true },
  { id: "zoom", name: "Zoom", desc: "Sync meetings and capture transcripts", connected: true },
  { id: "teams", name: "Microsoft Teams", desc: "Join calls from your calendar", connected: false },
  { id: "recall", name: "Recall.ai", desc: "Recording bot for any platform", connected: false },
]

const NOTIFS = [
  { id: "review", label: "Transcripts awaiting review", desc: "When a session transcript is ready for your sign-off", on: true },
  { id: "risk", label: "Risk & contradiction alerts", desc: "Wellbeing dips, dropping indices, renewal due", on: true },
  { id: "noshow", label: "No-shows & cancellations", desc: "When a client misses or cancels a session", on: true },
  { id: "digest", label: "Weekly caseload digest", desc: "Monday summary of your caseload by email", on: false },
]

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">{eyebrow}</p>
      <h2 className="mt-1 text-[15px] font-medium">{title}</h2>
      {sub && <p className="mt-0.5 text-[12.5px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

export function Settings() {
  const ref = useGsap((s) => revealChildren(s))
  const me = useMe()
  const { presetId, setPreset, presets, compassVisible, setCompassVisible } = useAppearance()
  const [integrations, setIntegrations] = useState(INITIAL_INTEGRATIONS)
  const [notifs, setNotifs] = useState(() => Object.fromEntries(NOTIFS.map((n) => [n.id, n.on])))
  const roleLabel = me.role === "admin" ? "Administrator" : "Career counsellor"

  const toggleIntegration = (id: string) => {
    setIntegrations((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it
        const next = !it.connected
        toast(next
          ? `${it.name} marked as your meeting platform — live account linking arrives with the backend connector.`
          : `${it.name} unmarked.`)
        return { ...it, connected: next }
      }),
    )
  }

  return (
    <div ref={ref} className="mx-auto max-w-3xl">
      <header data-reveal className="mb-8">
        <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-ink-300">Workspace</p>
        <h1 className="mt-1 font-display text-[32px] font-extralight tracking-tight">Settings</h1>
      </header>

      <div className="flex flex-col gap-6">
        {/* Profile & license */}
        <section data-reveal className="rounded-2xl border border-border bg-card p-5">
          <SectionHead eyebrow="Account" title="Profile & license" sub="Your identity on shared reports and client-facing exports." />
          <div className="mt-5 flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-ink-100 text-[16px] font-medium text-ink-700">
              {me.initials}
            </span>
            <div className="min-w-0">
              <div className="text-[14px] font-medium">{me.name}</div>
              <div className="text-[12.5px] text-muted-foreground">{roleLabel}{me.email ? ` · ${me.email}` : ""}</div>
            </div>
            <Button variant="outline" size="sm" className="ml-auto h-8" onClick={() => toast("Avatar upload coming soon")}>
              Change
            </Button>
          </div>
          <Separator className="my-5" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="full-name" className="text-[12px] font-medium text-ink-600">Full name</Label>
              <Input id="full-name" defaultValue={me.name} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-[12px] font-medium text-ink-600">Email</Label>
              <Input id="email" type="email" defaultValue={me.email ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title" className="text-[12px] font-medium text-ink-600">Title</Label>
              <Input id="title" defaultValue={roleLabel} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="license" className="text-[12px] font-medium text-ink-600">License number</Label>
              <Input id="license" placeholder="e.g. PSY-204881" defaultValue="PSY-204881" />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button size="sm" className="h-9" onClick={() => toast.success("Profile saved")}>Save changes</Button>
          </div>
        </section>

        {/* Appearance — font pairing */}
        <section data-reveal className="rounded-2xl border border-border bg-card p-5">
          <SectionHead eyebrow="Appearance" title="Typography" sub="Pick a font pairing for the console — thin, calm, and easy on long sessions. Applies instantly." />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {presets.map((p) => {
              const active = p.id === presetId
              return (
                <button
                  key={p.id}
                  onClick={() => { setPreset(p.id); toast.success(`Appearance · ${p.name}`) }}
                  aria-pressed={active}
                  className={cn(
                    "relative flex flex-col gap-3 rounded-2xl border p-4 text-left transition-[transform,box-shadow] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "border-brand-500 bg-brand-100/40 shadow-[var(--shadow-e2)]" : "border-border bg-card hover:shadow-[var(--shadow-e2)]",
                  )}
                >
                  {active && (
                    <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-brand-500 text-white">
                      <Check className="size-3 stroke-[2.5]" />
                    </span>
                  )}
                  <div className="flex items-baseline gap-2">
                    <span className="text-[32px] font-light leading-none tracking-tight text-foreground" style={{ fontFamily: p.display }}>Today</span>
                    <span className="text-[15px] tabular-nums text-ink-600" style={{ fontFamily: p.mono }}>74.2</span>
                  </div>
                  <p className="text-[12px] leading-snug text-ink-600" style={{ fontFamily: p.sans }}>
                    Career index declining · transcript awaiting review
                  </p>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium">{p.name}</span>
                    <span className="truncate text-[11px] text-muted-foreground">{p.note}</span>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 border-t border-hairline pt-4">
            <div className="min-w-0">
              <div className="text-[13px] font-medium">Compass assistant bar</div>
              <p className="mt-0.5 text-[12px] text-muted-foreground">Show the floating co-pilot bar at the bottom of every screen.</p>
            </div>
            <Switch checked={compassVisible} onCheckedChange={setCompassVisible} aria-label="Show Compass bar" />
          </div>
        </section>

        {/* Integrations */}
        <section data-reveal className="rounded-2xl border border-border bg-card p-5">
          <SectionHead eyebrow="Connections" title="Integrations" sub="Connect a calling platform so the bot can join and record sessions." />
          <div className="mt-5 flex flex-col divide-y divide-border">
            {integrations.map((it) => (
              <div key={it.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-secondary text-ink-700">
                  <Video className="size-4 stroke-[1.5]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium">{it.name}</div>
                  <div className="truncate text-[12px] text-muted-foreground">{it.desc}</div>
                </div>
                {it.connected ? (
                  <span className="hidden items-center gap-1.5 rounded-full bg-well-100 px-2.5 py-1 text-[11px] font-medium text-well-600 sm:inline-flex">
                    <Check className="size-3 stroke-[2]" /> Connected
                  </span>
                ) : (
                  <span className="hidden items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground sm:inline-flex">
                    Not connected
                  </span>
                )}
                <Button
                  variant={it.connected ? "outline" : "default"}
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => toggleIntegration(it.id)}
                >
                  {it.connected ? "Disconnect" : <><Plus className="size-3.5 stroke-[1.75]" /> Connect</>}
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Notifications */}
        <section data-reveal className="rounded-2xl border border-border bg-card p-5">
          <SectionHead eyebrow="Alerts" title="Notifications" sub="Choose what reaches you and when." />
          <div className="mt-5 flex flex-col divide-y divide-border">
            {NOTIFS.map((n) => (
              <label key={n.id} htmlFor={`notif-${n.id}`} className="flex cursor-pointer items-center gap-4 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium">{n.label}</div>
                  <div className="text-[12px] text-muted-foreground">{n.desc}</div>
                </div>
                <Switch
                  id={`notif-${n.id}`}
                  checked={notifs[n.id]}
                  onCheckedChange={(v) => setNotifs((p) => ({ ...p, [n.id]: v }))}
                  aria-label={n.label}
                />
              </label>
            ))}
          </div>
        </section>

        {/* Danger zone */}
        <section data-reveal className={cn("rounded-2xl border bg-card p-5", "border-risk-500/40")}>
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 stroke-[1.5] text-risk-600" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-risk-600">Danger zone</span>
          </div>
          <div className="mt-4 flex flex-col divide-y divide-border">
            <div className="flex flex-wrap items-center gap-4 py-4 first:pt-0">
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium">Export all data</div>
                <div className="text-[12px] text-muted-foreground">Download a portable archive of your caseload and notes.</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => {
                  // a REAL export: every smc.* record in this workspace as one JSON file
                  const dump: Record<string, unknown> = {}
                  for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i)
                    if (!k?.startsWith("smc.")) continue
                    try { dump[k] = JSON.parse(localStorage.getItem(k) ?? "null") } catch { dump[k] = localStorage.getItem(k) }
                  }
                  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" })
                  const a = document.createElement("a")
                  a.href = URL.createObjectURL(blob)
                  a.download = `setmycareer-export-${new Date().toISOString().slice(0, 10)}.json`
                  a.click()
                  URL.revokeObjectURL(a.href)
                  toast.success("Export downloaded — a JSON archive of this workspace's records.")
                }}
              >Export</Button>
            </div>
            <div className="flex flex-wrap items-center gap-4 py-4 last:pb-0">
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium text-risk-600">Delete account</div>
                <div className="text-[12px] text-muted-foreground">Permanently remove your practice and all client data. This cannot be undone.</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-risk-500/50 text-risk-600 hover:bg-risk-100 hover:text-risk-600"
                onClick={() => toast("Account deletion goes through support so client records are never lost by accident — email care@setmycareer.com and we'll handle it.")}
              >
                Delete account
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
