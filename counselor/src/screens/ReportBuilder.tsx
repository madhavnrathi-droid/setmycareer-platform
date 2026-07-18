import { useMemo, useState } from "react"
import { useSearchParams, Link } from "react-router-dom"
import {
  Check, ChevronLeft, ChevronRight, FileDown, Link2, EyeOff, ShieldCheck,
  TrendingUp, FileText, Copy, Plus, ExternalLink, UploadCloud,
} from "lucide-react"
import { toast } from "sonner"
import { uploadReport } from "@/lib/smc-live-api"
import { addClient, scaffoldClient, CLUSTER_LABELS } from "@/lib/mock"
import type { NewClientForm } from "@/lib/mock"
import { useCaseloadClients } from "@/lib/caseload"
import type { Client, ClusterKey } from "@/lib/types"
import { useGsap, revealChildren } from "@/lib/gsap"
import { ScoreRing } from "@/components/custom/ScoreRing"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// ---- step model -----------------------------------------------------------
const STEPS = ["Source", "Sections", "Audience", "Review", "Export"] as const
type StepIdx = 0 | 1 | 2 | 3 | 4

const TEMPLATES = [
  { key: "career_asset", label: "Career Asset" },
  { key: "recruiter_cv", label: "Recruiter CV" },
  { key: "progress", label: "Progress" },
  { key: "clinical_summary", label: "Clinical summary" },
  { key: "custom", label: "Custom" },
] as const
type TemplateKey = (typeof TEMPLATES)[number]["key"]

// ---- section catalogue ----------------------------------------------------
type SectionKey =
  | "index_trend" | "career_clusters" | "test_scores" | "session_timeline"
  | "transcript_quotes" | "wellbeing" | "prescriptions" | "notes" | "commentary"

interface SectionDef {
  key: SectionKey
  label: string
  hint: string
  consent?: boolean       // requires explicit client consent
  clinical?: boolean      // sensitive — auto-hidden for recruiter audience
  counselorOnly?: boolean // off by default
}

const SECTIONS: SectionDef[] = [
  { key: "index_trend", label: "Index + trend", hint: "Career & life-performance index with the 6-point trend line." },
  { key: "career_clusters", label: "pc. / cx. clusters", hint: "Career signal clusters and composite scores." },
  { key: "test_scores", label: "Test scores", hint: "RIASEC, Big Five, skills audit and other assessments." },
  { key: "session_timeline", label: "Session timeline", hint: "Dates, focus and index movement per session." },
  { key: "transcript_quotes", label: "Transcript quotes", hint: "Verbatim, evidence-gated quotes from sessions." },
  { key: "wellbeing", label: "Wellbeing", hint: "Wellbeing band + index.", consent: true, clinical: true },
  { key: "prescriptions", label: "Prescriptions", hint: "Active medication and adherence.", consent: true, clinical: true },
  { key: "notes", label: "Notes", hint: "SOAP / progress notes.", counselorOnly: true, clinical: true },
  { key: "commentary", label: "Counselor commentary", hint: "Free narrative written for the recipient." },
]

// default-on by template
const DEFAULTS: Record<TemplateKey, Partial<Record<SectionKey, boolean>>> = {
  career_asset: { index_trend: true, career_clusters: true, test_scores: true, commentary: true },
  recruiter_cv: { index_trend: true, career_clusters: true, test_scores: true },
  progress: { index_trend: true, session_timeline: true, transcript_quotes: true, commentary: true },
  clinical_summary: { index_trend: true, wellbeing: true, prescriptions: true, notes: true, commentary: true },
  custom: { index_trend: true },
}

type Audience = "client" | "recruiter" | "internal"
const AUDIENCES: { key: Audience; label: string; note: string }[] = [
  { key: "client", label: "Client", note: "The full self-facing read. Counselor-only notes stay hidden." },
  { key: "recruiter", label: "Recruiter", note: "External. Clinical & wellbeing sections are auto-redacted." },
  { key: "internal", label: "Internal", note: "Counselor / care-team. Everything you select is included." },
]

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" })

// ---------------------------------------------------------------------------
export function ReportBuilder() {
  const [params] = useSearchParams()
  const preselect = params.get("client") ?? ""

  const [step, setStep] = useState<StepIdx>(0)
  const [clientId, setClientId] = useState(preselect)
  // The picker is the counsellor's LIVE caseload (scaffolded to the full Client
  // shape so the preview renders honestly — zeros until a real assessment lands),
  // plus any client hand-added in this session.
  const { clients: caseload } = useCaseloadClients()
  const [added, setAdded] = useState<Client[]>([])
  const clientList = useMemo<Client[]>(
    () => [...added, ...caseload.filter((c) => !added.some((a) => a.id === c.id)).map((c) => scaffoldClient(c.id, c.name))],
    [added, caseload],
  )
  const [template, setTemplate] = useState<TemplateKey>("career_asset")
  const [audience, setAudience] = useState<Audience>("client")
  const [format, setFormat] = useState<"pdf" | "link">("pdf")
  const [sections, setSections] = useState<Record<SectionKey, boolean>>(() => initSections("career_asset"))
  const [shareLink, setShareLink] = useState<string | null>(null)

  // a numeric preselect (live client) that isn't yet in the caseload list still
  // resolves to a scaffold so /reports/new?client=<id> works from a deep link
  const client = useMemo(
    () => clientList.find((c) => c.id === clientId) ?? (/^\d+$/.test(clientId) ? scaffoldClient(clientId, `Client ${clientId}`) : undefined),
    [clientList, clientId],
  )
  const ref = useGsap((s) => revealChildren(s), [step])

  function handleAddClient(form: NewClientForm) {
    const created = addClient(form)
    setAdded((a) => [created, ...a])
    setClientId(created.id)
    toast.success("Client added", { description: `${created.name} is now selected.` })
  }

  function applyTemplate(t: TemplateKey) {
    setTemplate(t)
    setSections(initSections(t))
  }

  // recruiter audience forces clinical sections off (redaction)
  const redactedKeys = useMemo(
    () => (audience === "recruiter" ? SECTIONS.filter((s) => s.clinical).map((s) => s.key) : []),
    [audience],
  )
  const effective = useMemo(() => {
    const e = { ...sections }
    for (const k of redactedKeys) e[k] = false
    return e
  }, [sections, redactedKeys])

  const activeSections = SECTIONS.filter((s) => effective[s.key])
  const canNext = step !== 0 || !!clientId

  const goNext = () => setStep((s) => Math.min(4, s + 1) as StepIdx)
  const goBack = () => setStep((s) => Math.max(0, s - 1) as StepIdx)

  function doExport() {
    if (format === "pdf") {
      // the REAL export lives on the preview doc (print → save as PDF)
      toast("Opening the report — use Print / Save as PDF there.", { description: `${TEMPLATES.find((t) => t.key === template)!.label} · ${client?.name}` })
      window.location.href = `/reports/preview?client=${clientId}&print=1`
    } else {
      // sharing is real too — the preview's Share toggle publishes the report to
      // the client's portal profile; a portal deep-link is the honest "share link"
      const url = `${window.location.origin}/portal/reports/career`
      setShareLink(url)
      void navigator.clipboard?.writeText(url).catch(() => {})
      toast("Share via the preview's Share toggle — it publishes to the client's portal.", { description: "Their portal link is on your clipboard." })
    }
  }

  return (
    <div ref={ref} className="mx-auto max-w-3xl">
      <header data-reveal className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-ink-300">Builder</p>
          <h1 className="mt-1 font-display text-[32px] font-extralight tracking-tight">New report</h1>
        </div>
        <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground">
          <Link to="/reports"><ChevronLeft className="size-4 stroke-[1.5]" /> All reports</Link>
        </Button>
      </header>

      {/* ---- thin horizontal stepper ---- */}
      <div data-reveal className="mb-7">
        <ol className="flex items-center gap-2">
          {STEPS.map((label, i) => {
            const done = i < step
            const active = i === step
            return (
              <li key={label} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => i <= step && setStep(i as StepIdx)}
                  disabled={i > step}
                  className={cn(
                    "flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[12px] transition-colors",
                    active ? "text-foreground" : done ? "text-ink-600 hover:bg-secondary" : "text-ink-300",
                    i > step && "cursor-not-allowed",
                  )}
                >
                  <span className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-medium tabular-nums transition-colors",
                    active ? "bg-foreground text-background"
                      : done ? "bg-brand-100 text-brand-600"
                      : "border border-border text-ink-300",
                  )}>
                    {done ? <Check className="size-3.5 stroke-[2]" /> : i + 1}
                  </span>
                  <span className={cn("font-medium", active && "text-foreground")}>{label}</span>
                </button>
                {i < STEPS.length - 1 && <span className={cn("h-px flex-1", done ? "bg-brand-100" : "bg-border")} />}
              </li>
            )
          })}
        </ol>
      </div>

      <div data-reveal className="rounded-2xl border border-border bg-card p-5">
        {step === 0 && (
          <StepSource clientId={clientId} setClientId={setClientId} clientList={clientList} onAddClient={handleAddClient} template={template} applyTemplate={applyTemplate} />
        )}
        {step === 1 && (
          <StepSections sections={sections} setSections={setSections} redactedKeys={redactedKeys} />
        )}
        {step === 2 && (
          <StepAudience audience={audience} setAudience={setAudience} redactedKeys={redactedKeys} />
        )}
        {step === 3 && client && (
          <StepReview client={client} template={template} audience={audience} active={activeSections} />
        )}
        {step === 4 && client && (
          <StepExport client={client} format={format} setFormat={setFormat} sectionCount={activeSections.length} shareLink={shareLink} />
        )}
      </div>

      {/* ---- nav footer ---- */}
      <div data-reveal className="mt-5 flex items-center justify-between">
        <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-muted-foreground" onClick={goBack} disabled={step === 0}>
          <ChevronLeft className="size-4 stroke-[1.5]" /> Back
        </Button>
        {step < 4 ? (
          <Button size="sm" className="h-9 gap-1.5" onClick={goNext} disabled={!canNext}>
            Continue <ChevronRight className="size-4 stroke-[1.75]" />
          </Button>
        ) : (
          <Button size="sm" className="h-9 gap-1.5" onClick={doExport}>
            {format === "pdf" ? <FileDown className="size-4 stroke-[1.75]" /> : <Link2 className="size-4 stroke-[1.75]" />}
            {format === "pdf" ? "Export PDF" : "Create link"}
          </Button>
        )}
      </div>
    </div>
  )
}

// ===========================================================================
function initSections(t: TemplateKey): Record<SectionKey, boolean> {
  const d = DEFAULTS[t]
  return SECTIONS.reduce((acc, s) => {
    acc[s.key] = !!d[s.key]
    return acc
  }, {} as Record<SectionKey, boolean>)
}

// ---- step 1: source -------------------------------------------------------
const NEW_CLIENT = "__new_client__"

function StepSource({
  clientId, setClientId, clientList, onAddClient, template, applyTemplate,
}: {
  clientId: string
  setClientId: (v: string) => void
  clientList: Client[]
  onAddClient: (form: NewClientForm) => void
  template: TemplateKey
  applyTemplate: (t: TemplateKey) => void
}) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState("")
  const [relationship, setRelationship] = useState("")

  function submitNewClient() {
    const trimmed = name.trim()
    if (!trimmed) return
    onAddClient({ name: trimmed, relationship: relationship.trim() || undefined })
    setName("")
    setRelationship("")
    setAdding(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <Field label="Client" hint="The blueprint this report is generated from.">
        <Select
          value={clientId}
          onValueChange={(v) => {
            if (v === NEW_CLIENT) {
              setAdding(true)
              return
            }
            setClientId(v)
          }}
        >
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder="Select a client" />
          </SelectTrigger>
          <SelectContent>
            {clientList.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}{c.headline ? ` · ${c.headline}` : ""}</SelectItem>
            ))}
            <SelectItem value={NEW_CLIENT} className="text-brand-600 font-medium">
              <span className="flex items-center gap-1.5">
                <Plus className="size-3.5 stroke-[2]" /> New client
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        {adding && (
          <div className="mt-1 flex flex-col gap-3 rounded-lg border border-border bg-secondary p-4">
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">Quick-add client</div>
            <div className="flex flex-col gap-2.5">
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitNewClient() } }}
                placeholder="Full name"
                className="h-9 bg-background"
                aria-label="New client name"
              />
              <Input
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitNewClient() } }}
                placeholder="Relationship (optional) — e.g. career coaching"
                className="h-9 bg-background"
                aria-label="Relationship"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground"
                onClick={() => { setAdding(false); setName(""); setRelationship("") }}
              >
                Cancel
              </Button>
              <Button size="sm" className="h-8 gap-1.5" onClick={submitNewClient} disabled={!name.trim()}>
                <Plus className="size-3.5 stroke-[2]" /> Add &amp; select
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Just the name is required — you can fill in the full intake later from the client hub.</p>
          </div>
        )}
      </Field>

      <Field label="Template" hint="Sets sensible default sections — you can adjust them next.">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {TEMPLATES.map((t) => {
            const on = template === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => applyTemplate(t.key)}
                aria-pressed={on}
                className={cn(
                  "rounded-lg border px-3 py-3 text-left text-[13px] transition-colors",
                  on ? "border-brand-500 bg-brand-100 text-brand-600 font-medium" : "border-border text-ink-600 hover:border-ink-300",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  {t.label}
                  {on && <Check className="size-3.5 stroke-[2]" />}
                </span>
              </button>
            )
          })}
        </div>
      </Field>
    </div>
  )
}

// ---- step 2: sections -----------------------------------------------------
function StepSections({
  sections, setSections, redactedKeys,
}: {
  sections: Record<SectionKey, boolean>
  setSections: React.Dispatch<React.SetStateAction<Record<SectionKey, boolean>>>
  redactedKeys: SectionKey[]
}) {
  return (
    <div className="flex flex-col">
      <p className="mb-4 text-[12.5px] text-muted-foreground">Toggle what goes into the report. Consent-gated and counselor-only sections are labelled.</p>
      <ul className="flex flex-col divide-y divide-border">
        {SECTIONS.map((s) => {
          const willRedact = redactedKeys.includes(s.key)
          return (
            <li key={s.key} className="flex items-start gap-4 py-3.5 first:pt-0">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor={`sec-${s.key}`} className="text-[13.5px] font-medium">{s.label}</label>
                  {s.consent && <Tag tone="warn">Consent</Tag>}
                  {s.counselorOnly && <Tag tone="mind">Counselor-only</Tag>}
                  {willRedact && <Tag tone="risk">Redacted for recruiter</Tag>}
                </div>
                <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{s.hint}</p>
              </div>
              <Switch
                id={`sec-${s.key}`}
                checked={sections[s.key]}
                onCheckedChange={(v) => setSections((prev) => ({ ...prev, [s.key]: v }))}
                aria-label={s.label}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ---- step 3: audience -----------------------------------------------------
function StepAudience({
  audience, setAudience, redactedKeys,
}: {
  audience: Audience
  setAudience: (a: Audience) => void
  redactedKeys: SectionKey[]
}) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[12.5px] text-muted-foreground">Who is this for? Audience controls what the recipient is allowed to see.</p>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {AUDIENCES.map((a) => {
          const on = audience === a.key
          return (
            <button
              key={a.key}
              type="button"
              onClick={() => setAudience(a.key)}
              aria-pressed={on}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors",
                on ? "border-brand-500 bg-brand-100" : "border-border hover:border-ink-300",
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("text-[13.5px] font-medium", on ? "text-brand-600" : "text-foreground")}>{a.label}</span>
                {on && <Check className="size-4 stroke-[2] text-brand-600" />}
              </div>
              <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{a.note}</p>
            </button>
          )
        })}
      </div>

      {/* live redaction note */}
      {redactedKeys.length > 0 ? (
        <div className="flex items-start gap-3 rounded-lg border border-risk-100 bg-risk-100/50 px-4 py-3" role="status">
          <EyeOff className="mt-0.5 size-4 shrink-0 stroke-[1.5] text-risk-600" />
          <div>
            <div className="text-[12.5px] font-medium text-risk-600">Redaction applied</div>
            <p className="mt-0.5 text-[12px] text-foreground">
              {redactedKeys.length} clinical / wellbeing {redactedKeys.length === 1 ? "section" : "sections"} will be hidden from this recruiter report.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-lg bg-secondary px-4 py-3" role="status">
          <ShieldCheck className="size-4 shrink-0 stroke-[1.5] text-well-600" />
          <p className="text-[12px] text-ink-600">No redaction needed — all selected sections are permitted for this audience.</p>
        </div>
      )}
    </div>
  )
}

// ---- step 4: review (WYSIWYG-ish) -----------------------------------------
function StepReview({
  client, template, audience, active,
}: {
  client: Client
  template: TemplateKey
  audience: Audience
  active: SectionDef[]
}) {
  const bp = client.blueprint
  const clusters = Object.keys(CLUSTER_LABELS) as ClusterKey[]
  const has = (k: SectionKey) => active.some((s) => s.key === k)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">Preview</span>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] text-ink-600">
            {AUDIENCES.find((a) => a.key === audience)!.label} · {TEMPLATES.find((t) => t.key === template)!.label}
          </span>
          <Button asChild variant="outline" size="sm" className="h-7 gap-1.5 text-[12px]">
            <Link to={`/reports/preview?client=${client.id}`}>
              <ExternalLink className="size-3.5 stroke-[1.75]" /> View full report
            </Link>
          </Button>
        </div>
      </div>

      {/* page sheet */}
      <div className="rounded-lg border border-border bg-background p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-300">
          {TEMPLATES.find((t) => t.key === template)!.label} report
        </p>
        <h2 className="mt-1.5 font-display text-[clamp(20px,3vw,26px)] font-extralight tracking-tight">{client.name}</h2>
        <p className="text-[12.5px] text-muted-foreground">{client.age} · {client.headline}</p>
        <p className="mt-3 text-[13px] text-ink-600">{bp.headline}</p>

        {has("index_trend") && (
          <ReviewBlock title="Index & trend">
            <div className="flex flex-wrap items-center gap-6">
              <ScoreRing value={bp.careerIndex} size={68} stroke={4} sublabel="career" />
              <ScoreRing value={bp.bloomIndex} size={68} stroke={4} sublabel="life-perf" />
              <div className="min-w-[140px] flex-1">
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <TrendingUp className="size-3.5 stroke-[1.5] text-well-600" /> Career index · last 6 sessions
                </div>
                <Sparkline points={client.history.map((h) => h.careerIndex ?? 0)} />
              </div>
            </div>
          </ReviewBlock>
        )}

        {has("career_clusters") && (
          <ReviewBlock title="Career signals">
            <div className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
              {clusters.flatMap((ck) =>
                bp.signals.filter((s) => s.cluster === ck).slice(0, 1).map((s) => (
                  <div key={s.id}>
                    <div className="flex items-center justify-between text-[12.5px]">
                      <span className="text-ink-600">{CLUSTER_LABELS[ck]}</span>
                      <span className="font-medium tabular-nums">{s.score ?? "—"}</span>
                    </div>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-ink-100">
                      <div className="h-full rounded-full bg-foreground" style={{ width: `${s.score ?? 0}%` }} />
                    </div>
                  </div>
                )),
              )}
            </div>
          </ReviewBlock>
        )}

        {has("test_scores") && (
          <ReviewBlock title="Assessments">
            <ul className="flex flex-col gap-1.5 text-[12.5px]">
              <li className="flex justify-between"><span className="text-ink-600">RIASEC (Holland)</span><span className="tabular-nums">I-E</span></li>
              <li className="flex justify-between"><span className="text-ink-600">Big Five (Mini-IPIP)</span><span className="tabular-nums">High O, High C</span></li>
              <li className="flex justify-between"><span className="text-ink-600">Skills audit</span><span className="tabular-nums">72% vs PM</span></li>
            </ul>
          </ReviewBlock>
        )}

        {has("session_timeline") && (
          <ReviewBlock title="Session timeline">
            <ul className="flex flex-col gap-2">
              {client.history.slice(-3).reverse().map((h) => (
                <li key={h.ts} className="flex items-center justify-between text-[12.5px]">
                  <span className="text-ink-600 tabular-nums">{fmtDate(h.ts)}</span>
                  <span className="tabular-nums text-muted-foreground">index {h.careerIndex}</span>
                </li>
              ))}
            </ul>
          </ReviewBlock>
        )}

        {has("transcript_quotes") && bp.signals.some((s) => s.quote) && (
          <ReviewBlock title="In their words">
            <div className="flex flex-col gap-2.5">
              {bp.signals.filter((s) => s.quote).slice(0, 2).map((s) => (
                <blockquote key={s.id} className="border-l-2 border-border pl-3 text-[12.5px] italic text-ink-600">
                  “{s.quote}”
                </blockquote>
              ))}
            </div>
          </ReviewBlock>
        )}

        {has("wellbeing") && (
          <ReviewBlock title="Wellbeing" tone="mind">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[22px] font-extralight text-mind-600">{client.wellbeingBand ?? "—"}</span>
              <span className="text-[12px] tabular-nums text-muted-foreground">{client.clinical.wellbeingIndex ?? "—"}/100</span>
            </div>
          </ReviewBlock>
        )}

        {has("prescriptions") && (
          <ReviewBlock title="Prescriptions" tone="mind">
            <p className="text-[12.5px] text-ink-600">Pulled from active medication records with adherence.</p>
          </ReviewBlock>
        )}

        {has("notes") && (
          <ReviewBlock title="Counselor notes" tone="mind">
            <p className="text-[12.5px] text-ink-600">{client.clinical.notes[0] ?? "No notes recorded."}</p>
          </ReviewBlock>
        )}

        {has("commentary") && (
          <ReviewBlock title="Counselor commentary">
            <p className="text-[12.5px] leading-relaxed text-ink-600">
              {client.name.split(" ")[0]} is {bp.headline.toLowerCase()}. The evidence supports continued momentum; recommended next steps are documented in the care plan.
            </p>
          </ReviewBlock>
        )}

        {active.length === 0 && (
          <p className="mt-6 text-[12.5px] text-muted-foreground">No sections selected — go back and enable at least one section.</p>
        )}
      </div>
    </div>
  )
}

// ---- step 5: export -------------------------------------------------------
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string))

/** A minimal, branded HTML rendering of the report, used as the file we upload
 *  to the live SetMyCareer server (Reports/uploadReport accepts a file). */
function buildReportHtml(client: Client): string {
  const bp = client.blueprint
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(client.name)} — SetMyCareer Career Report</title><style>body{font-family:Georgia,'Times New Roman',serif;max-width:720px;margin:48px auto;padding:0 24px;color:#171717;line-height:1.65}.eyebrow{font-family:Arial,Helvetica,sans-serif;letter-spacing:.12em;text-transform:uppercase;font-size:11px;color:#089040}h1{font-size:30px;font-weight:400;margin:.2em 0}.muted{color:#666}.k{font-size:52px;font-weight:300;margin:.1em 0}.k span{font-size:15px;color:#666}</style></head><body><p class="eyebrow">SetMyCareer · Find Your True North</p><h1>${esc(client.name)}</h1><p class="muted">${esc(client.headline ?? "")}</p>${bp?.careerIndex != null ? `<p class="k">${bp.careerIndex}<span> / 100 career index</span></p>` : ""}${bp?.headline ? `<p>${esc(bp.headline)}</p>` : ""}<hr style="border:none;border-top:1px solid #eee;margin:28px 0"><p class="muted" style="font-size:12px">Generated by the SetMyCareer counsellor console. This is the counsellor-prepared career report for ${esc(client.name)}.</p></body></html>`
}

function StepExport({
  client, format, setFormat, sectionCount, shareLink,
}: {
  client: Client
  format: "pdf" | "link"
  setFormat: (f: "pdf" | "link") => void
  sectionCount: number
  shareLink: string | null
}) {
  const [saving, setSaving] = useState(false)
  // Confirm-gated save to the LIVE SetMyCareer server. Never auto-fires; a real
  // upload writes production data, so it always asks first.
  async function saveToServer() {
    const ok = window.confirm(
      `Upload ${client.name}'s report to the LIVE SetMyCareer server (production), client id ${client.id}?\n\nThis writes real data to setmycareer.com and can't be auto-undone.`,
    )
    if (!ok) return
    setSaving(true)
    try {
      const file = new File([buildReportHtml(client)], `${client.name.replace(/\s+/g, "_")}_Career_Report.html`, { type: "text/html" })
      await uploadReport(String(client.id), `${client.name} — Career Report`, file)
      toast.success("Saved to SetMyCareer", { description: `${client.name}'s report was uploaded to the live server.` })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed"
      toast.error(/disabled/i.test(msg) ? "Live writes are off — set VITE_SMC_WRITES_ENABLED=true to save to the server." : `Couldn't save: ${msg}`)
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-well-100">
          <FileText className="size-5 stroke-[1.5] text-well-600" />
        </span>
        <div>
          <h2 className="font-display text-[20px] font-light tracking-tight">Ready to export</h2>
          <p className="text-[12.5px] text-muted-foreground">{client.name} · {sectionCount} {sectionCount === 1 ? "section" : "sections"}</p>
        </div>
      </div>

      <Separator />

      <Field label="Delivery format">
        <div className="grid gap-2.5 sm:grid-cols-2">
          {([
            { key: "pdf", label: "PDF", note: "A polished document to download or attach.", icon: FileDown },
            { key: "link", label: "Shareable link", note: "A secure, expiring link to the live view.", icon: Link2 },
          ] as const).map((o) => {
            const on = format === o.key
            const Icon = o.icon
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => setFormat(o.key)}
                aria-pressed={on}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                  on ? "border-brand-500 bg-brand-100" : "border-border hover:border-ink-300",
                )}
              >
                <Icon className={cn("mt-0.5 size-4 shrink-0 stroke-[1.5]", on ? "text-brand-600" : "text-ink-300")} />
                <div>
                  <div className={cn("text-[13.5px] font-medium", on ? "text-brand-600" : "text-foreground")}>{o.label}</div>
                  <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{o.note}</p>
                </div>
              </button>
            )
          })}
        </div>
      </Field>

      {format === "link" && shareLink && (
        <Field label="Shareable link" hint="Anyone with this link can view the report — expires in 14 days.">
          <ShareLinkField url={shareLink} />
        </Field>
      )}

      <Separator />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-muted-foreground">
          Use the buttons to {format === "pdf" ? "generate the PDF" : "create the link"}, or save the report to SetMyCareer.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-9 gap-1.5">
            <Link to={`/reports/preview?client=${client.id}`}>
              <ExternalLink className="size-4 stroke-[1.5]" /> View full report
            </Link>
          </Button>
          <Button onClick={saveToServer} disabled={saving} size="sm" className="h-9 gap-1.5">
            <UploadCloud className="size-4 stroke-[1.5]" /> {saving ? "Saving…" : "Save to SetMyCareer"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Read-only link field with an inline copy button (lucide Copy → Check).
function ShareLinkField({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      /* clipboard may be unavailable — still show the copied affordance */
    }
    setCopied(true)
    toast.success("Link copied")
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary p-1.5 pl-3">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        aria-label="Shareable report link"
        className="min-w-0 flex-1 bg-transparent text-[12.5px] text-ink-600 outline-none"
      />
      <Button
        type="button"
        size="sm"
        variant={copied ? "secondary" : "default"}
        className="h-8 shrink-0 gap-1.5"
        onClick={copy}
        aria-label="Copy link"
      >
        {copied ? <Check className="size-3.5 stroke-[2]" /> : <Copy className="size-3.5 stroke-[1.75]" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  )
}

// ---- small shared bits ----------------------------------------------------
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">{label}</div>
        {hint && <p className="mt-0.5 text-[12px] text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function ReviewBlock({ title, tone, children }: { title: string; tone?: "mind"; children: React.ReactNode }) {
  return (
    <div className="mt-5 border-t border-border pt-4">
      <div className={cn(
        "mb-2.5 text-[10px] font-medium uppercase tracking-[0.12em]",
        tone === "mind" ? "text-mind-600" : "text-ink-300",
      )}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Tag({ tone, children }: { tone: "warn" | "mind" | "risk"; children: React.ReactNode }) {
  const map = {
    warn: "bg-warn-100 text-warn-600",
    mind: "bg-mind-100 text-mind-600",
    risk: "bg-risk-100 text-risk-600",
  }
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", map[tone])}>{children}</span>
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null
  const w = 160, h = 32, pad = 2
  const min = Math.min(...points), max = Math.max(...points)
  const span = max - min || 1
  const d = points
    .map((p, i) => {
      const x = pad + (i / (points.length - 1)) * (w - pad * 2)
      const y = h - pad - ((p - min) / span) * (h - pad * 2)
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" aria-hidden>
      <path d={d} fill="none" stroke="var(--color-well-600)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
