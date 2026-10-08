import assert from "node:assert/strict"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const frontend = join(dirname(fileURLToPath(import.meta.url)), "..")
const kit = join(frontend, "..", "kaya-logo")
const brand = join(frontend, "public", "brand")
const read = (...parts) => readFileSync(join(...parts))
const text = (...parts) => readFileSync(join(...parts), "utf8")

const SVGS = [
  "favicon.svg", "kaya-app-icon-simple.svg", "kaya-app-icon.svg", "kaya-lockup-on-dark.svg", "kaya-lockup.svg",
  "kaya-mark-mono.svg", "kaya-mark-on-dark.svg", "kaya-mark-simple.svg", "kaya-mark.svg", "kaya-wordmark-on-dark.svg", "kaya-wordmark.svg",
]
const PNGS = {
  "apple-touch-icon.png": [180, 180],
  "icon-192.png": [192, 192],
  "icon-512.png": [512, 512],
  "kaya-lockup-light.png": [1400, 480],
  "kaya-lockup-on-dark.png": [1400, 480],
  "kaya-mark-1024.png": [1024, 1024],
}
const FULL_BLADE = "M54 50C43 36 50 16 69 6C73 25 72 40 63 50Q58.5 53 54 50zM56.8 30a4.2 4.2 0 1 0 8.4 0a4.2 4.2 0 1 0-8.4 0z"
const SIMPLE_BLADE = "M54 50C43 36 50 16 69 6C73 25 72 40 63 50Q58.5 53 54 50z"
const pngSize = (buffer) => {
  assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "is a PNG")
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)]
}

test("public/brand holds the whole kit: the 11 SVGs and the 6 PNGs, and nothing else", () => {
  assert.deepEqual(readdirSync(brand).sort(), [...SVGS, ...Object.keys(PNGS)].sort())
})

test("every file in public/brand is exactly the file in the kit", { skip: !existsSync(kit) }, () => {
  for (const name of readdirSync(brand)) {
    const folder = name.endsWith(".svg") ? "svg" : "png"
    assert.ok(read(brand, name).equals(read(kit, folder, name)), `${name} differs from kaya-logo/${folder}/${name}`)
  }
})

test("the PNGs are the right sizes", () => {
  for (const [name, size] of Object.entries(PNGS)) assert.deepEqual(pngSize(read(brand, name)), size, name)
})

test("the SVGs are single svg elements with the same two blade drawings", () => {
  for (const name of SVGS) {
    const svg = text(brand, name).trim()
    assert.ok(svg.startsWith("<svg ") && svg.endsWith("</svg>") && svg.match(/<svg /g).length === 1, name)
  }
  for (const name of ["kaya-mark.svg", "kaya-mark-on-dark.svg", "kaya-mark-mono.svg", "kaya-lockup.svg", "kaya-lockup-on-dark.svg", "kaya-app-icon.svg"]) {
    assert.ok(text(brand, name).includes(FULL_BLADE), `${name} has the full blade`)
  }
  for (const name of ["kaya-mark-simple.svg", "kaya-app-icon-simple.svg", "favicon.svg"]) {
    assert.ok(text(brand, name).includes(`${SIMPLE_BLADE}"`) && !text(brand, name).includes("a4.2"), `${name} has the simple blade, no seed holes`)
  }
})

test("the colours follow the kit's rules: forest and clay on light, cream and light clay on dark, one colour for mono", () => {
  const colours = (name) => [...new Set(text(brand, name).match(/#[0-9A-Fa-f]{6}/g))].sort()
  assert.deepEqual(colours("kaya-mark.svg"), ["#1F3D2B", "#C2643A"])
  assert.deepEqual(colours("kaya-lockup.svg"), ["#1F3D2B", "#C2643A"])
  assert.deepEqual(colours("kaya-mark-on-dark.svg"), ["#E07A45", "#F4EEE2"])
  assert.deepEqual(colours("kaya-lockup-on-dark.svg"), ["#E07A45", "#F4EEE2"])
  assert.deepEqual(colours("kaya-wordmark.svg"), ["#1F3D2B"])
  assert.deepEqual(colours("kaya-wordmark-on-dark.svg"), ["#F4EEE2"])
  assert.deepEqual(colours("kaya-mark-mono.svg"), [])
  assert.ok(text(brand, "kaya-mark-mono.svg").includes("currentColor"))
})

test("the Next.js app icons are the kit's: icon.svg is favicon.svg, apple-icon.png is the 180px touch icon", () => {
  assert.ok(read(frontend, "app", "icon.svg").equals(read(brand, "favicon.svg")))
  assert.ok(read(frontend, "app", "apple-icon.png").equals(read(brand, "apple-touch-icon.png")))
  assert.deepEqual(pngSize(read(frontend, "app", "apple-icon.png")), [180, 180])
})

test("favicon.ico holds three PNG frames: 16, 32 and 48px", () => {
  const ico = read(frontend, "app", "favicon.ico")
  assert.equal(ico.readUInt16LE(0), 0)
  assert.equal(ico.readUInt16LE(2), 1, "type: icon")
  assert.equal(ico.readUInt16LE(4), 3, "three frames")
  const sizes = []
  for (let i = 0; i < 3; i++) {
    const entry = 6 + i * 16
    const [width, height] = [ico.readUInt8(entry), ico.readUInt8(entry + 1)]
    const length = ico.readUInt32LE(entry + 8)
    const offset = ico.readUInt32LE(entry + 12)
    assert.deepEqual(pngSize(ico.subarray(offset, offset + length)), [width, height], `frame ${i}`)
    sizes.push(width)
  }
  assert.deepEqual(sizes, [16, 32, 48])
  if (existsSync(kit)) assert.ok(ico.equals(read(kit, "favicon.ico")), "same as kaya-logo/favicon.ico")
})

test("the KayaMark component draws the kit's blades and diamond, and takes its colours from the theme", () => {
  const source = text(frontend, "components", "kaya-mark.tsx")
  assert.ok(source.includes(`"${FULL_BLADE}"`) && source.includes(`"${SIMPLE_BLADE}"`))
  assert.ok(source.includes('"M60 55l5 5-5 5-5-5z"') && source.includes('"M60 54l6 6-6 6-6-6z"'))
  assert.ok(source.includes('fill="currentColor"'), "blades follow the text colour")
  assert.ok(source.includes('fill="var(--kaya-accent, #C2643A)"'), "the diamond follows --kaya-accent")
  if (existsSync(kit)) {
    // Same drawing as the kit's own component, whatever the semicolons.
    const strip = (code) => code.replace(/;\s*$/gm, "").replace(/\s+/g, " ")
    const body = (code) => strip(code).slice(strip(code).indexOf("export function KayaMark"))
    assert.equal(body(source), body(text(kit, "react", "KayaMark.tsx")))
  }
})

test("--kaya-accent is clay in light mode and light clay in dark mode, and the sidebar has a dark-ground version", () => {
  const css = text(frontend, "app", "globals.css")
  assert.match(css, /:root \{[\s\S]*?--kaya-accent: oklch\(0\.606 0\.133 43\.6\); \/\* #C2643A/)
  assert.match(css, /--kaya-accent-on-dark: oklch\(0\.684 0\.144 46\.5\); \/\* #E07A45/)
  assert.match(css, /\.dark \{[\s\S]*?--kaya-accent: var\(--kaya-accent-on-dark\); \/\* #E07A45/)
})

test("the brand component shows only the name (the mark is switched off for now), and no K badge", () => {
  const source = text(frontend, "components", "brand-mark.tsx")
  assert.ok(!source.includes("<KayaMark"), "the logo mark is switched off in the header")
  assert.match(source, /Kaya<\/span>/)
  assert.ok(!source.includes("coin-rim") && !/>\s*K\s*</.test(source), "the round K badge is gone")
})
