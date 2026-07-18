import { Link } from "react-router-dom"
import { LogoMark } from "@/components/Brand"
import { useSeo } from "@/lib/seo"

// A real 404 — bearings lost, compass offered. (The catch-all used to soft-serve
// the home page, which reads as a broken redirect to crawlers and people alike.)
export function NotFound() {
  useSeo({ title: "404 — SetMyCareer", description: "This page doesn't exist. Reset your bearings.", path: "/404" })
  return (
    <main className="wrap flex min-h-svh flex-col items-center justify-center text-center">
      <LogoMark size={40} className="text-ink-20" />
      <p className="kicker mt-8 text-ink-40">404 · Off the map</p>
      <h1 className="h-xl mt-4 max-w-[16ch]">This page doesn't <span className="b">exist</span>.</h1>
      <p className="lead mt-5 max-w-md text-ink-60">Wrong turns happen — that's rather the point of a compass.</p>
      <div className="mt-9 flex items-center gap-7">
        <Link to="/" className="ul text-[14px] font-medium">Back to true north</Link>
        <Link to="/product" className="ul text-[14px] text-ink-60">See the product</Link>
      </div>
    </main>
  )
}
