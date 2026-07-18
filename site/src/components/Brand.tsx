// SetMyCareer brand primitives — the official compass / north-star glyph and the
// Cambo serif wordmark. Tagline: "Find Your True North". The mark inherits
// currentColor; the wordmark is the only capital-S serif lockup.

export function LogoMark({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 119.41 124.52" fill="currentColor" className={className} role="img" aria-label="SetMyCareer">
      <path d="M118.27,81.65l-14.24-19.6,13.94-19.18c1.93-2.66,1.34-6.38-1.32-8.31-2.67-1.93-6.38-1.34-8.31,1.32l-11.66,16.05-14.66-20.17,19.36-6.29c3.12-1.02,4.83-4.37,3.82-7.5-1.01-3.12-4.36-4.83-7.5-3.82l-23.04,7.49L60.73,2.45c-1.93-2.66-5.65-3.25-8.31-1.32-2.66,1.93-3.25,5.65-1.32,8.31l11.66,16.05-23.71,7.71V13.08c0-3.29-2.66-5.95-5.95-5.95s-5.95,2.67-5.95,5.95v23.99l-22.55,7.33c-3.12,1.02-4.83,4.37-3.82,7.5.82,2.52,3.15,4.11,5.66,4.11.61,0,1.23-.09,1.84-.29l18.87-6.13v24.93l-19.36-6.29c-3.14-1-6.48.7-7.5,3.82-1.02,3.13.69,6.48,3.82,7.5l23.03,7.48v23.83c0,3.29,2.66,5.95,5.95,5.95s5.95-2.67,5.95-5.95v-19.96l23.72,7.71-11.96,16.47c-1.93,2.66-1.34,6.38,1.32,8.31,1.06.77,2.28,1.14,3.49,1.14,1.84,0,3.65-.85,4.82-2.45l14.24-19.6,22.56,7.33c.61.2,1.23.29,1.84.29,2.51,0,4.84-1.6,5.66-4.11,1.02-3.13-.69-6.48-3.82-7.5l-18.87-6.13,14.66-20.17,11.97,16.47c1.16,1.6,2.98,2.45,4.82,2.45,1.21,0,2.44-.37,3.49-1.14,2.66-1.93,3.25-5.65,1.32-8.31ZM70.12,88.48l-31.07-10.1v-32.66l31.07-10.1,19.2,26.43-19.2,26.43Z" />
    </svg>
  )
}

export function Wordmark({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <span className={`font-wordmark leading-none tracking-[-0.01em] ${className}`} style={{ fontSize: size }}>Setmycareer</span>
}

export function Lockup({ size = 20, tagline = false, className = "" }: { size?: number; tagline?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={Math.round(size * 1.25)} />
      <span className="flex flex-col leading-none">
        <Wordmark size={size} />
        {tagline && <span className="mt-1 kicker !text-[8.5px] opacity-60">Find Your True North</span>}
      </span>
    </span>
  )
}

export const TAGLINE = "Find Your True North"
