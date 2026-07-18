import type { UIMessage } from "ai"
import { NavigateCard, ClientCard, ScheduleCard, ExplainCard, RecordCard } from "@/components/assistant/cards"
import { CareerToolCard, isCareerToolName } from "@/portal/components/CareerCards"

/* Renders a Compass message's parts: streamed text + ANY generative-UI tool card
   — the counsellor tools (record / navigate / client / schedule / explain) AND
   the member tools (careerCard / studyPath / reportInsight / actionStep /
   packageCard / compareCard / followUps). Shared by the Compass bar's AnswerPanel,
   the client's floating guide bar, and the full-screen Assistant so every surface
   renders the same cards from a tool name + input.

   `onAct` lets a counsellor host dismiss itself after a card action. `onCardAction`
   routes a member card's action (book_session, view_report, …) and `onReply` sends
   a follow-up chip — both optional, so counsellor surfaces degrade gracefully. */
export function MessageParts({
  m, onAct, onCardAction, onReply,
}: {
  m: UIMessage
  onAct?: () => void
  onCardAction?: (action: string, detail?: string) => void
  onReply?: (text: string) => void
}) {
  return (
    <>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(m.parts as any[]).map((part, i) => {
        if (part.type === "text")
          return part.text ? <p key={i} className="whitespace-pre-wrap">{part.text}</p> : null
        // ── member (client) generative-UI cards ──
        if (typeof part.type === "string" && isCareerToolName(part.type) && part.input)
          return <CareerToolCard key={i} name={part.type} input={part.input} onAction={onCardAction} onReply={onReply} />
        // ── counsellor cards ──
        if (part.type === "tool-startRecording")
          return <RecordCard key={i} clientName={part.input?.clientName} onAct={onAct} />
        if (part.type === "tool-goToScreen" && part.input?.screen)
          return <NavigateCard key={i} screen={part.input.screen} reason={part.input.reason} onAct={onAct} />
        if (part.type === "tool-showClient" && part.input?.name)
          return <ClientCard key={i} name={part.input.name} onAct={onAct} />
        if (part.type === "tool-scheduleSession" && part.input?.clientName)
          return <ScheduleCard key={i} clientName={part.input.clientName} when={part.input.when} note={part.input.note} />
        if (part.type === "tool-explainMetric" && part.input?.metric)
          return <ExplainCard key={i} metric={part.input.metric} />
        return null
      })}
    </>
  )
}
