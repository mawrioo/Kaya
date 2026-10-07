import type { SVGProps } from "react"

/**
 * The Kaya mark: four Parang-curved blades around a Kawung centre,
 * with a clay diamond (the celengan) in the middle. From the logo kit in kaya-logo/.
 *
 * - The blades use `currentColor`, so set the colour with a text class
 *   (e.g. `text-primary` or `text-sidebar-foreground`).
 * - The diamond uses `--kaya-accent` (falls back to clay #C2643A).
 * - Use `simple` below about 48px: it drops the seed holes, which turn to noise.
 */
export function KayaMark({
  simple = false,
  title = "Kaya",
  ...props
}: SVGProps<SVGSVGElement> & { simple?: boolean; title?: string }) {
  const blade = simple
    ? "M54 50C43 36 50 16 69 6C73 25 72 40 63 50Q58.5 53 54 50z"
    : "M54 50C43 36 50 16 69 6C73 25 72 40 63 50Q58.5 53 54 50zM56.8 30a4.2 4.2 0 1 0 8.4 0a4.2 4.2 0 1 0-8.4 0z"
  const diamond = simple ? "M60 54l6 6-6 6-6-6z" : "M60 55l5 5-5 5-5-5z"
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={title} {...props}>
      <title>{title}</title>
      <g transform="translate(6 6) scale(.9)">
        <g fill="currentColor" fillRule={simple ? undefined : "evenodd"}>
          {[0, 90, 180, 270].map((r) => (
            <path key={r} d={blade} transform={r ? `rotate(${r} 60 60)` : undefined} />
          ))}
        </g>
        <path d={diamond} fill="var(--kaya-accent, #C2643A)" />
      </g>
    </svg>
  )
}
