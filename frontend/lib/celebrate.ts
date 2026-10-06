/**
 * A short shower of coins and paper pieces, in the palette's own colours, for the moment a goal is reached. It is made
 * of plain elements that fall once and remove themselves. It does nothing when the system asks for less movement.
 */
export function coinShower() {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

  const layer = document.createElement("div")
  layer.setAttribute("aria-hidden", "true")
  layer.style.cssText = "position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:90"
  const paper = ["moss", "marigold", "sage", "sand", "clay", "sky", "plum", "rose", "teal", "ochre"].map((name) => `var(--cat-${name})`)

  for (let index = 0; index < 46; index++) {
    const coin = index % 4 === 0
    const size = coin ? 15 + Math.random() * 6 : 6 + Math.random() * 6
    const piece = document.createElement("span")
    piece.style.cssText = [
      "position:absolute",
      "top:0",
      `left:${3 + Math.random() * 94}%`,
      `width:${size}px`,
      `height:${coin ? size : size * 1.7}px`,
      `background:${coin ? "var(--highlight)" : paper[index % paper.length]}`,
      `border-radius:${coin ? "50%" : "2px"}`,
      coin ? "border:2px dotted color-mix(in oklch, var(--highlight-foreground) 45%, transparent)" : "",
      `animation:confetti-fall ${1500 + Math.random() * 1200}ms cubic-bezier(0.25, 0.5, 0.5, 1) ${Math.random() * 450}ms both`,
      `--drift:${Math.round((Math.random() - 0.5) * 180)}px`,
      `--spin:${Math.round((Math.random() - 0.5) * 900)}deg`,
    ].join(";")
    layer.appendChild(piece)
  }

  document.body.appendChild(layer)
  window.setTimeout(() => layer.remove(), 3600)
}
