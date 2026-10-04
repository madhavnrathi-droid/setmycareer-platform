import { Component, type ReactNode } from "react"
import { useLocation, Link } from "react-router-dom"
import { AlertCircle, RotateCw } from "lucide-react"

// One screen failing must not take the workspace with it. Before this existed there was
// no error boundary anywhere: a render error in any screen (e.g. one malformed field in an
// API response) unmounted the whole tree — sidebar, top bar and Compass included — and left
// a blank white page with nothing to click. The boundary sits around each shell's <Outlet>,
// so the navigation stays usable and only the broken screen is replaced.

type Props = { children: ReactNode; home: string; resetKey: string }
type State = { error: Error | null }

class Boundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error("[screen]", error)
  }

  componentDidUpdate(prev: Props) {
    // navigating elsewhere is a fresh attempt
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div role="alert" className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-card p-6">
        <AlertCircle aria-hidden className="size-5 text-risk-600" />
        <h1 className="mt-3 font-display text-[19px] font-semibold tracking-tight text-foreground">This screen didn't load</h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
          Something in this view failed. The rest of your workspace is fine, and nothing you saved was lost. Reloading usually fixes it.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background hover:opacity-90"
          >
            <RotateCw aria-hidden className="size-3.5" /> Reload
          </button>
          <Link to={this.props.home} className="rounded-full px-4 py-2 text-[13px] font-medium text-foreground hover:bg-secondary">
            Go to the dashboard
          </Link>
        </div>
        <details className="mt-5 text-[12px] text-muted-foreground">
          <summary className="cursor-pointer select-none">Technical detail for support</summary>
          <p className="mt-2 break-words font-mono text-[11.5px]">{error.message || String(error)}</p>
        </details>
      </div>
    )
  }
}

export function ScreenBoundary({ children, home }: { children: ReactNode; home: string }) {
  const { pathname } = useLocation()
  return <Boundary home={home} resetKey={pathname}>{children}</Boundary>
}
