// Setmycareer logo — logomark (vector, currentColor) + Cambo wordmark + tagline.
// The mark is the brand's 5-stroke compass/north-star, extracted from the
// official guidelines. Everything inherits `color`, so the same component is
// black-on-white in light surfaces and white-on-black inside the nav/dark blocks.
import mark from './logomark.svg?raw'

export function LogoMark({ size = 24, className = '', style }) {
  return (
    <span
      className={'logomark ' + className}
      aria-hidden="true"
      style={{ width: size, height: size, display: 'inline-flex', flexShrink: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: mark }}
    />
  )
}

// variant: 'full' (mark + wordmark) | 'mark' | 'lockup' (mark over wordmark)
export default function Logo({ variant = 'full', size = 22, tagline = false, className = '', style }) {
  if (variant === 'mark') return <LogoMark size={size} className={className} style={style} />
  const col = variant === 'lockup'
  return (
    <span
      className={'brand-logo ' + className}
      aria-label="Setmycareer"
      style={{ display: 'inline-flex', alignItems: col ? 'center' : 'center', flexDirection: col ? 'column' : 'row', gap: col ? size * 0.4 : size * 0.46, ...style }}
    >
      <LogoMark size={col ? size * 1.4 : size * 1.18} />
      <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1, alignItems: col ? 'center' : 'flex-start' }}>
        <span className="brand-word" style={{ fontSize: size }}>Setmycareer</span>
        {tagline && <span className="brand-tag" style={{ fontSize: size * 0.34 }}>Find Your True North</span>}
      </span>
    </span>
  )
}
