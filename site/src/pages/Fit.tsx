import { FitFlow } from "@/components/fit/FitFlow"
import { useSeo } from "@/lib/seo"

/* /fit — the Package-Fit Test. A full-page dark experience: the fit_test
   gradient carries the intake, the quiz runs one question per view on plain
   ink, and the result returns the colour as the recommended programme's own
   gradient. All motion is transform/opacity only; reduced motion swaps
   instantly with everything visible. */
export function Fit() {
  useSeo({
    title: "The Package-Fit Test — find your programme in 5 minutes | SetMyCareer",
    description:
      "A short, reflective test across six dimensions — clarity, breadth, stakes, support, family, urgency — plus two questions in your own words, matched against every SetMyCareer programme. You get an AI-written plan: your best fit, a recommended journey, and your next moves. Free, on screen.",
    path: "/fit",
  })
  return (
    <main className="plate-dark min-h-svh">
      <FitFlow />
      {/* fit-scoped motion: question slide/fade + result bars. Keyframes touch
          transform/opacity only; reduced-motion turns them off entirely. */}
      <style>{`
        .fit-in-r { animation: fit-in-r 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .fit-in-l { animation: fit-in-l 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes fit-in-r { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: none; } }
        @keyframes fit-in-l { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: none; } }
        .fit-bar { transform-origin: left; transition: transform 1s cubic-bezier(0.16, 1, 0.3, 1); }
        @media (prefers-reduced-motion: reduce) {
          .fit-in-r, .fit-in-l { animation: none; }
          .fit-bar { transition: none; }
        }
      `}</style>
    </main>
  )
}
