// Minimal isometric line diagrams for the four instruments — Bauhaus-style
// monoline marks (currentColor, 1.5px) so they sit quietly on any ground.
//   personality → nested cube (the inner life inside the outer shell)
//   interest    → four overlapping circles (pulls from many directions)
//   ability     → 3×3 divided cube (measured parts of one mind)
//   competency  → stacked planes (capability built layer on layer)

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const }

export function IsoGlyph({ id, className }: { id: string; className?: string }) {
  const common = { className, viewBox: "0 0 48 48", "aria-hidden": true }
  if (id === "sigma_interest") {
    return (
      <svg {...common}>
        <circle cx="19" cy="19" r="10" {...S} />
        <circle cx="29" cy="19" r="10" {...S} />
        <circle cx="19" cy="29" r="10" {...S} />
        <circle cx="29" cy="29" r="10" {...S} />
      </svg>
    )
  }
  if (id === "aptitude" || id === "aptitude_dbda") {
    // 3×3 isometric cube
    return (
      <svg {...common}>
        <path d="M24 6 40 15v18L24 42 8 33V15Z" {...S} />
        <path d="M8 15l16 9 16-9M24 24v18" {...S} />
        <path d="M13.33 12l16 9M18.67 9l16 9M8 21l16 9M8 27l16 9M40 21l-16 9M40 27l-16 9M29.33 21v18M34.67 18v18M18.67 21v18M13.33 18v18" {...S} strokeWidth={0.9} opacity={0.7} />
      </svg>
    )
  }
  if (id === "aptitude_ccpa" || id === "competency") {
    // stacked isometric planes
    return (
      <svg {...common}>
        <path d="M24 8 38 16 24 24 10 16Z" {...S} />
        <path d="M24 17 38 25 24 33 10 25Z" {...S} />
        <path d="M24 26 38 34 24 42 10 34Z" {...S} />
      </svg>
    )
  }
  // personality — nested isometric cube
  return (
    <svg {...common}>
      <path d="M24 5 41 14.5v19L24 43 7 33.5v-19Z" {...S} />
      <path d="M7 14.5l17 9.5 17-9.5M24 24v19" {...S} />
      <path d="M24 16 33 21v10l-9 5-9-5V21Z" {...S} />
      <path d="M15 21l9 5 9-5M24 26v10" {...S} />
    </svg>
  )
}
