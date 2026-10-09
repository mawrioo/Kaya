---
name: Kaya
description: A calm, warm, premium "mindful money" tracker. Cream paper, forest green, one orange accent.
colors:
  cream: "#F7F2E7"
  card-white: "#FFFEFB"
  ink: "#18261E"
  ink-muted: "#5E6A61"
  forest: "#1F3D2B"
  forest-hover: "#2A4C37"
  sage: "#E5ECE0"
  sage-ink: "#2E5A40"
  sand: "#F1E8D8"
  sand-ink: "#6B5230"
  orange: "#E8833A"
  orange-ink: "#2A1606"
  positive: "#2D6A45"
  clay: "#B0432C"
  hairline: "#E6DFD2"
  track: "#ECE6DA"
  night: "#0F1712"
typography:
  display:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "2.75rem"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "1.375rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.012em"
  display-mobile:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "2.25rem"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  amount-hero:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "4rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.025em"
  amount-hero-mobile:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "2.5rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.025em"
  amount:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "1.75rem"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
  nav:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.4
  small:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.5
  wordmark:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 600
    letterSpacing: "0.04em"
rounded:
  control: "12.8px"
  card: "18px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.cream}"
    rounded: "{rounded.control}"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.sand}"
    textColor: "{colors.forest}"
    rounded: "{rounded.control}"
    height: "36px"
  nav-item:
    textColor: "{colors.cream}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 12px"
  nav-item-hover:
    backgroundColor: "{colors.forest-hover}"
  nav-item-active:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.forest}"
  card:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.card}"
    padding: "20px"
  icon-badge:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.sage-ink}"
    rounded: "{rounded.pill}"
    size: "40px"
  chip:
    backgroundColor: "{colors.sand}"
    textColor: "{colors.sand-ink}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  date-pill:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "36px"
  progress:
    backgroundColor: "{colors.track}"
    rounded: "{rounded.pill}"
    height: "6px"
---

# Design System: Kaya

## Overview

A personal ledger that feels like good paper rather than a trading screen. Cream grounds, warm white cards and a deep forest green sidebar carry the calm; one orange accent marks progress. Serif is reserved for headings and big amounts, so numbers read as the most important thing on the page. Inter handles everything you scan.

The source of truth for every value is `app/globals.css` (OKLCH, with hex comments). The hex values here mirror it. Preview everything at `/styleguide`.

## Colors

Two themes share the same roles. Light mode is a warm cream page (`#F7F2E7`, made a touch creamier on 30 Sep 2026 because the first cream read too bright) under near-white cards, so cards stand out gently. Dark mode is deep green-black with cream text, never neutral gray, and its accents are softened a step.

| Role | Light | Dark | Used for |
|---|---|---|---|
| `background` | `#F7F2E7` | `#0F1712` | Page |
| `card` | `#FFFEFB` | `#17221B` | Cards, date pill |
| `muted` | `#F0EBDD` | `#1D2922` | Quiet fills |
| `foreground` | `#18261E` | `#EEE8DB` | Text |
| `muted-foreground` | `#5E6A61` | `#A2AEA4` | Labels, meta, captions |
| `primary` | `#1F3D2B` | `#B4D1B6` | Primary buttons, links |
| `sidebar` | `#1F3D2B` | `#173024` | Sidebar and mobile top bar |
| `sidebar-primary` | `#F7F2E7` | `#DFD9CA` | Active nav pill, selected theme option |
| `sage` / `sage-foreground` | `#E5ECE0` / `#2E5A40` | `#1F3128` / `#A9CBAF` | Round icon badges |
| `sand` / `sand-foreground` | `#F1E8D8` / `#6B5230` | `#2C281E` / `#D8C39F` | Chips, secondary buttons |
| `highlight` | `#E8833A` | `#E6915A` | Progress fills, the Quick add coin, sidebar focus ring |
| `positive` | `#2D6A45` | `#8FC79F` | Helper lines, income |
| `negative` / `destructive` | `#B0432C` | `#E58A73` | Spending amounts, errors, overspending |
| `border` | `#E6DFD2` | `#27342C` | Hairlines |
| `track` | `#ECE6DA` | `#26342C` | Progress track |

### Contrast (WCAG 2.2)

Every text pairing clears AA (4.5:1) in both themes. The weakest pairings:

| Pair | Light | Dark |
|---|---|---|
| Secondary text on muted fill | 4.8 | 6.6 |
| Secondary text on page | 5.1 | 7.9 |
| Sidebar secondary text on sidebar | 5.9 | 6.0 |
| Sidebar secondary text on the theme switch's track (and on a hovered row) | 4.8 | 4.9 |
| Clay on card | 5.7 | 6.4 |
| Helper green on card | 6.4 | 8.5 |
| Orange focus ring on sidebar (needs 3:1) | 4.4 | 5.8 |
| The small "Rp" in an amount (92% strength), in the weakest colour | 4.7 | 5.6 |
| Destructive button text on its tint (resting / hovered) | 4.9 / 4.6 | 4.9 / 4.5 |
| The faint "0" in an amount box (large text, needs 3:1) | 3.3 | 4.6 |

The one exception is deliberate: the light-mode orange fill is 2.2:1 against its track. A progress bar therefore always shows its value as text, and the bar is never the only signal.

### Category palette

Ten muted earth tones, keyed by `PaletteColor` in `lib/types.ts` and exposed as `bg-cat-<key>` (with `/14` tints for chips). Each clears 3:1 against the card in both themes, so it works as a dot, icon or chart mark. Never use it for body text. Map keys to classes through `lib/palette.ts` so Tailwind sees every class.

| Key | Light | Dark |
|---|---|---|
| moss | `#3F6B4F` | `#8CC09A` |
| sage | `#6E9A78` | `#A9C9AE` |
| marigold | `#D9772B` | `#EDA15C` |
| sand | `#B08A55` | `#D6B988` |
| clay | `#B4553B` | `#E28C71` |
| sky | `#4A7A9C` | `#8DB6D4` |
| plum | `#7B5889` | `#B89DC9` |
| rose | `#B8637C` | `#E29BAF` |
| teal | `#35827D` | `#7CC4BD` |
| ochre | `#9A7F27` | `#D2B865` |

Charts use `chart-1` to `chart-5` (moss, marigold, sage, sand, clay) or, for category charts, the `var(--cat-*)` variables directly, so marks follow the theme.

### Named Rules

- **One orange.** Orange marks progress. It is never body text, and the only button that wears it is the round Quick add coin. The logo's clay (`--kaya-accent`, a redder colour) is a different colour and only ever the small diamond in the middle of the mark.
- **Money direction.** Income is green with "+", spending is clay with "−", and a transfer between your own wallets is neutral with no sign. Clay is a muted brick, never bright red. Bars that compare income with spending stay neutral (moss and sand).

## Typography

- **Source Serif 4** (variable, optical sizes 8 to 60) for page titles, card titles and big amounts. Optical sizing keeps it fine at 44px and sturdy at 22px, and its compact lining figures keep "Rp 125.450.000" inside a stat card at 1024px.
- **Inter** for body, labels, buttons, tables and every small number. Use `tabular-nums` wherever amounts stack in a column.

### Hierarchy

| Utility | Face | Size | Use |
|---|---|---|---|
| `type-display` | Serif 400 | 44px, 36px under 768px | Page title or greeting |
| `type-title` | Serif 500 | 22px | Card and section titles |
| `type-amount-hero` | Serif 400 | 64px, 40px under 768px | The one headline balance (Home total) |
| `type-amount` | Serif 500 | 28px | Stat card numbers |
| `type-figure` | Serif 500 | 20px | A figure in the middle of a page: the totals strip, 9 Oct 2026 |
| `text-base` | Inter 400 | 16px / 1.5 | Body |
| `text-sm` | Inter 400–500 | 14px | Labels, meta, list secondary lines |
| `text-xs` | Inter 500 | 12px | Chips only |

The sidebar uses two more Inter steps: `nav` (15px, links) and `small` (13px, the calm line and the theme switch). The wordmark is serif 20px, 600, tracked +0.04em (mixed-case "Kaya"; the kit's 0.16em was made for capitals).

The serif roles are `type-*` utilities, not `text-*`, so `cn()` never mistakes them for text colors.

### Money

- `formatRupiah()` returns "Rp 1.250.000", with a non-breaking space so "Rp" never wraps away from its number. It uses "−" (U+2212) for negatives and an optional "+" for income.
- `<Money>` is for display sizes (roughly 20px and up). It sets "Rp" smaller and quieter (92% strength and no less, so it still clears 4.5:1 in every colour) so long amounts read by their digits. The thousands dots are a little softer (70%), so 51.337.800 reads in groups. With `roll` (balances, a goal's saved amount) a digit that changes pops in from below, like a counter ticking over: the first paint never animates and the text is always exactly the text.
- In lists and sentences, use plain `formatRupiah()`.
- Never set a `<Money>` figure smaller than 24px. The softer thousands dots (70%) clear 3:1 only as large text; at 22px they measured 3.2 and 3.8 against 4.5 (found on the month recap card's phone layout, which is now 24px).

## Layout

- The sidebar is 224px wide from 768px up, and a button beside the name folds it down to a 48px strip of icons (and opens it again); the choice is kept in the `sidebar_state` cookie, so the page arrives already folded or open, and Ctrl+B does the same. Below 768px it becomes a sheet, opened from a forest-green top bar (18rem wide, no fold button).
- Content sits in a column up to 1200px wide, with 20px side padding on phones, 32px from 768px and 48px from 1280px.
- Every page opens with the same header. On Home the title is a time-of-day greeting with the owner's name ("Good morning, Mario"). The greeting word changes language by itself (see Rotating greeting). Serif title on the left, date pill on the right from 1024px. Below that the pill sits above the title, so a two-word title never wraps.
- Spacing runs on a 4px base. Cards use 20–32px padding and grid gaps are 16px. Sections are separated by 40–56px, always with more space above a heading than below it.
- Grids step down rather than squeeze: wallet cards go 4 → 2 → 1 columns, and fact grids go 3 → 2 → 1.
- Home, top to bottom: total balance card, wallet cards, then "This month" beside "Spending by category" (2:3 from 1280px, stacked below), then "Budgets" (only when at least one category has a budget: one full-width panel, its rows in two columns from 1280px), then "Savings goals" beside "Recent transactions" (1:1 from 1280px, stacked below). Rows are 24px apart.
- Transactions, top to bottom: the search box with "Import CSV" (outline) and "Add transaction" beside it (they wrap under the search when the window is narrow, right-aligned, and share a row on a phone); the date, type, category and wallet filters; the totals strip; the list in one card. The strip is a single band, never three cards.
- Wallets, top to bottom: the total balance card, then a "Your wallets" heading with "Reorder" (an outline button, icon only on phones) and "Add wallet" at its far right, then the wallet cards: two columns when the cards' own room is at least 704px wide (a container query on the section, not the window), one below that. With the menu open that is from a 1024px window; with the menu folded to icons it is from about 770px. (The window used to decide at 768px, and the cards were then about 215px wide, so a note wrapped letter by letter.) Sections are 32px apart and cards 16px.
- Goals, top to bottom: one quiet line about all the goals together ("Rp 164.720.000 left to save across 3 goals") with "Reorder" (only from two goals up, and just an icon on a phone) and "Add goal" at its far right, then the goal cards: one wide card per row below 1280px, two across from 1280px (the same point where Home's panels go two-up). Goals still being saved for come first, in the owner's own order. Goals already reached are not in that grid: they are folded into a "Completed (2)" line at the bottom. With no goals the line and the buttons give way to one empty state. Cards are 16px apart.
- Categories, top to bottom: one quiet line ("A lock means a preset. Presets come with the app, so they can't be renamed or deleted.") with "Reorder" (an outline button, icon only on a phone) and "Add category" at its right; then two cards, Expense categories and Income categories, side by side from 1280px (top aligned, so the shorter card just ends sooner) and stacked below, 24px apart like Home's panels. Under the Income card, in the same column (so it fills the space the shorter card leaves, and sits at the very bottom of the page when the cards are stacked), comes "Needs a category", but only while something is filed under Other (see below). Each card says which month its amounts are for ("Spent in September 2026"). Presets come first in each card and then the owner's own, unless the owner has put them in another order. The Expense card starts with the "Whole month" row (see Whole month row), which is not a category.
- Insights, top to bottom: a toolbar that wraps, with the view switch (Month | Compare | Year) and the period switcher (the month, or the year on Year) at the left and "Export" (an outline button) at the right; then the view. **Month:** the month recap card (see Month recap, or a calendar drawing for a month with nothing in it), then three stat cards (in one row from 1024px, stacked below; a tablet with the sidebar open is too narrow for three amounts across), the "Month by month" chart and then the "Total balance" panel, each across the full width, then two columns from 1280px (stacked below): "Spending by category" and "Biggest expenses" on the left; "Budgets", "Income by category", "Spending by wallet" and "Spending by day of the week" on the right. **Compare:** one panel, "Compare two months". **Year:** four stat cards (two across from 1024px, four from 1280px), the twelve coins (see Twelve coins), the chart, "Total balance" across the full width, "The year in numbers", then "Spending by category" beside "Income by category" from 1280px, with "Average spending by day of the week" under Income by category in the same column (last of the three when they stack). Sections are 24px apart and the cards 16px, like Home.
- Every grid starts with `grid-cols-1`, including small ones inside a card or a form field. Without it the single column can't shrink below its widest child, and a phone gets a sideways scroll.
- A long unbroken word (a pasted link in a note, a name made of the widest letters) breaks at the edge instead of running off: `wrap-anywhere` goes on every title, note, name, hint and dialog sentence that can hold the owner's own text. `break-words` is not enough inside a flex row.
- Dialogs, menus and popovers never grow taller than the window: they scroll inside (`max-h` and `overflow-y-auto`), so a phone on its side can still reach every button. Small controls get a bigger invisible tap area on touch screens (`tap-area`, an extra 8px all round); what you see doesn't change.
- The first Tab stop on every page is a "Skip to main content" pill. It only shows while it has focus, and moves focus to the page (`#main-content`, the `<main>` element).

## Elevation & Depth

Depth comes mostly from the step between page and card plus a hairline border. Shadows are faint and tinted with forest green (`rgb(31 61 43 / …)`), so they read warm, never gray. They replace Tailwind's `shadow-xs` to `shadow-lg`, so shadcn components inherit them.

### Shadow Vocabulary

- `shadow-xs`: date pill, selected theme option.
- `shadow-sm`: cards, active nav pill.
- `shadow-md` and `shadow-lg`: popovers and sheets only.

In dark mode shadows turn black and heavier. They anchor floating layers rather than lift cards.

## Motion

Motion is small and only marks change. In the Reorder list the row you drag lifts (a slight scale and a deeper shadow) while the others slide out of its way. New rows and deleted rows ease in and out over 0.26s (an expo-out curve), animating height and opacity, plus a 24px slide to the right on the way out. A day that appears or disappears moves as one piece. Filtering and paging never animate. Swipe snapping uses a stiff spring. A transaction, wallet, goal or category brought back with Undo eases in in the same way. A wallet, goal or category you just added fades in with a small rise over 0.5s (and on a phone the page scrolls to it). The bar of a goal eases to its new length when money is added. Everything respects "reduce motion".

Step 6 added a few more, all answering something you did (nothing moves on its own except the Home donut, once). The **Completed** fold fades in as its arrow turns (0.2s). The **donut** draws itself clockwise from 12 o'clock when Home opens (0.65s, a mask that exists only while it runs, so the tooltip is never clipped). Buttons, round buttons, links, nav items and wallet cards squeeze or settle slightly while pressed. The **eye** blinks when pressed, and the amount (or its dots) fades back in. A digit that changes pops in from below (0.34s). The **Kaya mark** in the sidebar turns once when you point at it (the old K coin's flip, kept on the new mark for now). The **sprout** by the sidebar's calm line sways once when you point at the line. When money is added to a goal, a **coin** falls into the bar and lands where the fill ends (0.8s, in step with the bar). When a goal is **reached**, a short shower of coins and paper pieces in the palette's colours falls once (about 3s, drawn by `lib/celebrate.ts`), with a celengan in the message. A wrong PIN shakes the lock screen's dots once. Under "reduce motion" the shower isn't made at all, the coin has already gone, the donut is simply there, and the others end at once. The `motion` library's own animations (the reorder lists) follow it too, through one `MotionProvider` in the root layout.

## Shapes

`--radius` is 12.8px. Controls and nav items use 12.8px, cards 18px, and chips, badges, pills and progress bars are fully round. The round badges that stand for something (wallets, goals, categories on their own page, stat cards) wear a milled coin edge: a ring of dots just inside the rim, in the badge's own colour at 30% (`coin-rim`). Badges in dropdowns and in dense lists stay plain. Icons are lucide line icons at 16–18px, and nothing else stands in for them.

## Components

### Buttons

Heights are 36px, or 44px in touch contexts. Primary is forest with cream text in light mode, and soft sage with dark text in dark mode. Secondary uses sand, and destructive uses a clay tint. Every clickable element gets a pointer cursor. Pressing squeezes a button to 97% (a button that opens a menu opens it instead). A dropdown's box is 40px, level with the search, date and note boxes beside it (its own default of 36px loses to `data-[size=default]:h-10`), and it gets the same light hover as the date button.

### Chips

Fully round, 12px medium text. Category chips use the category tint with a dot of the solid color. Status chips use sand or sage.

### Cards / Containers

White card, 1px hairline, 18px radius, `shadow-sm`. Never nest cards. Lists inside a card are rows divided by hairlines.

### Navigation

Items are 36px tall from 768px up (44px in the phone's sheet, for fingers), with a cream 14px label and a 16px icon on forest. Folded, each is a 32px icon with its name in a tooltip to the right, and the name stays in the page for screen readers; the owner's row shrinks to its round badge. The fold button (a 32px ghost button with a panel icon, "Collapse menu" or "Expand menu") sits at the right end of the header row, beside the name; when folded it is the only thing in the header. The active page gets a light pill with forest text, plus `aria-current="page"`, and hover is a lighter green. Keyboard focus is a 2px orange ring. At the bottom sits one row, the owner's name with "Settings" under it, which opens the account menu (see Account menu): Change name, Back up now, Light / Dark / Auto and the calm line. Before all of it comes the skip link (see Layout). The bottom of the sidebar, and of the phone's menu sheet, carries a very faint kawung lattice (cream at 7.5%, starting about 46% of the way down) that fades out upward before it reaches the menu, so the forest column feels woven rather than flat. The sprout by the calm line sways once when you point at the line.

### Logo (the Kaya mark)

The logo is the **Kaya mark**: four Parang-curved blades turning around a Kawung centre, with a clay diamond in the middle (the celengan). It comes from the logo kit in `kaya-logo/` (its README has the rules), and the app's copies are in `public/brand/`.

- **Colours.** Forest `#1F3D2B` and clay `#C2643A` on light grounds, cream `#F4EEE2` and light clay `#E07A45` on dark ones. The diamond is the only clay in the mark; the blades are never clay. Tokens in `globals.css`: `--kaya-accent` (clay in light mode, light clay in dark mode) and `--kaya-accent-on-dark` (always light clay).
- **The component** is `components/kaya-mark.tsx`: the blades in `currentColor`, the diamond in `--kaya-accent`, and a `simple` version without the seed holes, which is the one to use under 48px.
- **In the app.** The brand link at the top of the sidebar, and in the phone's top bar, is the simple mark at 44px in the `sidebar-primary` cream, next to the wordmark. Those grounds are forest green in light and dark mode alike, so the link sets `--kaya-accent` to `--kaya-accent-on-dark` itself. The mark is decorative (the link is named "Kaya, home") and takes no pointer events of its own, and a -4px margin keeps its layout box at 36px, so the header is the height it always was. The wordmark is live text in Source Serif 4 SemiBold, 20px, letter-spaced 0.04em for mixed-case "Kaya" (the kit's SVG files still have capital outlines at 0.16em).
- **Icons.** `app/icon.svg` is the browser tab icon (a rounded forest square holding the simple cream mark), `app/favicon.ico` carries 16, 32 and 48px frames for old browsers, and `app/apple-icon.png` is the 180px iPhone home-screen icon. `public/brand/` also holds the lockup, wordmark, app icon and PNG files for the README and slides, and `icon-192.png` and `icon-512.png` for the web app manifest (`app/manifest.ts`: name Kaya, standalone, cream background, forest theme colour).
- **Rules** (from the kit): clear space of at least a quarter of the mark's width; the simple version under 48px; never recolour the blades in clay, rotate the mark, add a shadow, or put it inside a circle or coin. Coins elsewhere (goals, milestones, the celengan, the Quick add coin) are not the logo.
- **Pointing at it.** For now the mark still turns once when pointed at, as the K coin did (see Motion). Whether to keep that, turn it a quarter instead, or drop it is the owner's call.

### Account menu (bottom of the sidebar)

`components/sidebar-user.tsx`. The only thing in the sidebar's footer, so the six pages always have the room: before, the name, "Back up now", the calm line and the theme switch were four stacked blocks (about 45% of a phone's menu) and clipped the last page. One row, at least 48px tall: the 32px round badge with the first letter, the name in `nav` type (it wraps), "Settings" under it in `small` muted type and a small chevron at the right that turns over while the menu is open. The whole row is one button: a lighter green on hover and while open, and the 2px orange ring on keyboard focus.

Pressing it opens a popover above the row (the sidebar's own dark green, a 1px light ring and `shadow-lg`, the width of the row and never under 15rem; Escape closes it and focus returns to the row). Inside: **Change name** ("Used in the greeting on Home"), **Back up now** (the "Last backup: 4 Oct, 15:30" or "No backup yet" line; it closes the menu, and on a phone the sheet too, so the message isn't hidden), then the PIN rows in the same shape (a key icon and "Set a PIN", "Ask for it before Kaya opens"; or, once a PIN is set, a padlock and "Lock Kaya", "Ask for the PIN again", which locks this device at once, and "PIN settings", "Change it or turn it off"; see PIN settings), a hairline, **Appearance** with the Light / Dark / Auto switch, a hairline, and the calm line ("Runs on this computer. Your numbers stay here.", the sprout still sways when pointed at). Change name closes the menu and opens the name box; closing the box puts focus back on the row. The rows are the same shape as before (badge, words, a muted line). The Name row and Backup row sections below describe the rows' wording; they now sit in this menu instead of directly in the sidebar.

### Name row and name box

The owner's name at the bottom of the sidebar, above the calm line. A 32px round badge holds the first letter (a quiet lighter green with a cream letter, so it isn't mistaken for an account), then the name in `nav` type (it wraps, never cut off) with "Change name" under it in `small` muted type, and a small muted pencil at the right. The whole row is one button, at least 44px tall: a lighter green on hover and the 2px orange ring on keyboard focus.

Pressing it opens the same dialog as the wallet form (28rem wide): "Your name", "The greeting on Home uses it.", one box labelled Name (30 characters at most, holding the current name, with the cursor in it), Cancel and Save. An empty name is refused in plain words under the box ("Enter your name.") and the cursor goes back to it. Saving closes the box, changes the greeting on Home and the row at once, and says so ("Name saved"); a failed save keeps the box open with what was typed. On a phone the menu sheet closes first and the box opens over the page, and when it closes keyboard focus goes back to the button that opened the menu. The greeting on Home wraps anywhere, so even 30 letters of the widest kind never make the page scroll sideways.

### Backup row

`components/sidebar-backup.tsx`. Under the name row at the bottom of the sidebar (and of the phone's menu sheet), in the same shape: a 32px round badge (the same quiet lighter green, with a database-backup line icon), "Back up now" in `nav` type and under it, in `small` muted type, "Last backup: 4 Oct, 15:30" (the day and time as the backend wrote them, so a time zone never shifts them) or "No backup yet". Nothing at the right. The whole row is one button, at least 44px tall: a lighter green on hover and the 2px orange ring on keyboard focus. The two rows sit 4px apart as one group, with the usual 20px above the calm line.

Pressing it copies the data file and shows a message ("Backup saved", with the file's name and the folder: `nabungbego-2026-10-04-153012.db in backend/data/backups`). While it works the small line says "Backing up…" and further presses are ignored (the button is not disabled, because a disabled button drops keyboard focus). A failed copy says "Couldn't back up" with a plain reason and changes nothing. On a phone the menu sheet closes first, so the message isn't hidden behind it, and keyboard focus goes back to the menu button. It is never automatic.

### Panel

`components/panel.tsx`. The card behind every Home section: 18px radius, hairline, `shadow-sm`, serif title with an optional quiet caption (the month) and an action (the "See all" link) on the right. 20px padding on phones, 24px from 768px.

### Total balance card

The hero. A sage-to-white diagonal wash with an engraving behind it (see Delight layer: a kawung lattice fading in from the right, and from 768px a round seal like the one on a banknote), the label "Total balance" with the eye button at the far right, the amount at `type-amount-hero`, and under it a segmented bar showing each wallet's share of the total with a legend of name and percent. It is the only card with a tint. Hiding the total also removes the bar and legend, so the card shrinks to the label, the dots and "Across 4 wallets". The bar and the percentages only count wallets that hold money, so they add up to 100%. A wallet below zero is not a slice but a line of its own under the legend (a 16px clay alert mark, "Below zero:" in muted text, the wallet's name in medium weight and its amount in the muted clay; one line for each such wallet, the furthest below first). Each of those lines follows its own wallet's eye, and all of them go with the total's.

### Stat card

A round sage icon badge with a muted label, then the `type-amount` number, then one helper line. The helper is green when encouraging and muted when neutral.

### Wallet card (Home)

The wallet's badge (its icon in its own colour, 40px) on top, with a sand "Investment" chip beside it on Pluang and the eye button at the far right, then the wallet name with a small arrow at its right, and the `type-amount` balance. There is no note line on Home; the notes are on the Wallets page. Name sits above the number so the chip never squeezes it, and a long name wraps. The whole card is a link to that wallet's transactions: hover deepens the shadow and nudges the arrow right, and keyboard focus draws the 2px ring around the whole card. The eye sits above the link so it works on its own. Cards in a row are the same height and the balance is pinned to the bottom of its card, so the amounts line up across a row even when a long name wraps (a card with a shorter name simply has a little more room above its amount).

### Wallet badge

`components/wallet-badge.tsx`. A round badge holding the wallet's icon, tinted in the wallet's colour (the same soft tint and icon colour that category chips use, so contrast is already checked in both themes). Three sizes: 24px in dropdown lists, 40px on Home and in dialogs, 44px on a wallet card. The colour matches the wallet's slice in the total balance bar, so a wallet looks the same everywhere.

### Balance eye toggle

A 40px round ghost button in the top-right of the total balance card and every wallet card. An open eye means the amount is showing; a crossed eye means it is hidden. The icon is muted, and hover adds a faint tint of the text color. Its accessible name says what a press will do ("Hide BCA balance" / "Show BCA balance"). A hidden amount keeps the small "Rp" and shows seven small dots in the muted text color, always the same length, so the amount can't be guessed. The choice is per card and remembered in a cookie. Hiding the total also removes the wallet-share bar and its legend from the card, since the split would give the amount away; a wallet's own eye hides only that wallet's balance.

### Wallet card (Wallets page)

A white card with 20–24px padding. Top row: the wallet badge (44px); the wallet name in medium weight with its note under it in small muted text (the sand "Investment" chip follows Pluang's name); and, at the far right, the eye and a round "more" button (40px ghost buttons, "···"). Under that the balance at `type-amount`, and on Pluang "Update value" (the secondary sand button) at the right of the balance. Under the balance, a wallet that has goals saved in it shows one small muted line: "Rp 19.500.000 set aside for 2 goals · Rp 5.350.000 free" (the amount in medium weight; the free part only when something is left). When the goals ask for more than the wallet holds it reads "Rp 31.000.000 is set aside for 2 goals, more than this wallet holds." with a small clay alert mark in front. The words stay muted, so it is a quiet flag rather than an alarm. The line is left out while that wallet's balance is hidden, because it would give the balance away. Nothing else sits under the balance except Pluang's value-change lines. Cards in the same row are the same height and share their rows: the name and note, the balance, the goals line and the value-change lines are four rows of one grid (the list lays them out with `grid-template-rows: subgrid`, from the card's own grid), so a note that wraps in one card never pushes the balance beside it lower, and a shorter card just has some empty space at its bottom. The balance line is always 40px tall, the height of Pluang's "Update value" button, so every balance sits on the same line.

The whole card is one link to that wallet's transactions. The name is the link, and its invisible overlay covers the card, so the eye, the "more" button, "Update value" and "History" sit above it and still work on their own. On hover the shadow deepens from `shadow-sm` to `shadow-md` and the name is underlined, the only hint that the card is a link (there is no arrow on this page, unlike Home's cards). Keyboard focus draws the 2px ring around the whole card, not just the name.

Pluang also shows how its value last moved, under the balance: a small trending arrow and "+Rp 120.000 since last update" in green, or "−Rp 150.000 since last update" in clay, or a muted "No change since last update" (and "No value update yet." before the first one). A small underlined "History" link sits at the right end of that line once there is something to show. Below it, a muted line: "Value changes don't count as income or spending." The change line is left out while that balance is hidden, because it would give the balance away.

Long names and notes wrap instead of being cut off, and the Investment chip drops to its own line when there is no room beside the name (about 360px).

### Wallet menu

`components/ui/dropdown-menu.tsx`. A popover panel in the same look as the dropdown lists (popover background, 1px ring, `shadow-md`, 8px radius) with roomy rows: Edit details, Correct balance (not on investments, which have Update value), History, then a hairline and Delete wallet in clay. Icons are lucide line icons in the muted colour, and the delete row's icon is clay. Focus is a soft accent fill, arrow keys move through the rows, Escape closes and returns to the button.

### Deposito (time deposit)

A wallet of its own kind ("Deposito (time deposit)", piggy-bank icon). It sits in the total, the share bar and every wallet list like any wallet, with a sand "Deposito" chip beside its name (on Wallets and on Home). The money in it **comes out of another wallet** (never another deposito) and **goes back to that wallet** when the owner confirms at maturity. Its balance is **the money put in plus the interest earned so far**, worked out by the backend on the day it is read and never saved, and the interest is never income. Simple interest by the day (amount × yearly rate × days ÷ 365, rounded down), before tax. It has **no nickname**: only Quick add reads one, and nothing can be recorded in a deposito.

Under the balance on its Wallets card, in small muted type: one line (`5% a year · ends 1 Oct 2027 · 11 months left`; `renews on …` when it renews by itself; `matured on … · goes back to BCA` once it has; `Money moved out on …` once settled), then `Rp 1.000.000 put in · +Rp 4.109 interest so far, before tax` (the interest in green; this line is left out while the balance is hidden with the eye, because together they are the balance). A matured deposito that doesn't renew has a secondary **Move money** button.

- **Menu:** Edit details and Delete wallet only. There is no Correct balance and no History, because the balance follows its rate and dates.
- **Add:** no Nickname box. After Type come **Money comes from** (a dropdown of every wallet except deposito wallets, with a line saying what it holds and that the amount is taken out of it now, as a transfer, and goes back to it at maturity), Amount put in (the big amount box; more than the source holds is refused with "BCA only holds Rp 8.742.300."), Yearly rate (%) and Tenor (months) side by side (one column on a phone), Start date (the usual calendar; today by default), a two-way "Renews by itself?" switch (No, Yes) with a line saying what each means, and a quiet paragraph: the balance is worked out from the dates, the interest is never income, and "Interest is shown before tax. A final tax of 20% applies to deposit interest above Rp 7.500.000 a year." The plain Starting balance box is replaced by Amount put in. Adding it makes **one transfer** from the source wallet to the deposito ("Opened deposito …", dated the start day, or today if that day hasn't come), so the total does not change.
- **Edit:** the rate, start date, tenor and renew choice can be changed until the money has been moved out. **The amount can't:** it is shown, not typed, with "It came out of BCA, so it can't be changed here. To change it, delete this deposito and add it again." An older deposito that never recorded where its money came from shows "Money came from (optional)": choosing a wallet takes the amount out of it now, as one transfer; leaving it empty changes nothing. After the money has been moved out only the name, note and look can change, and the form says so.
- **Move money** (a dialog): "Move the money back to BCA", what it holds (money put in and interest), "It goes back to BCA, the wallet it came from." and a line saying it is saved as one transfer, isn't income, and can't be undone. There is nothing to choose and nothing moves until "Move money" is pressed. If it doesn't know where it came from (an older deposito, or the wallet was deleted) the dialog asks "Move it into" with every wallet except deposito wallets. Afterwards the deposito shows Rp 0 and "Money moved out on …", and the source wallet has what it gave plus the interest.
- **Delete:** the usual dialog, with one more bullet while the money is still in: "Its Rp … is not moved back to BCA, so it is gone from your money here. Use Move money first to keep it." (or "Wait until it matures and use Move money to keep it.").
- **Rules the backend enforces:** no income, spending or transfer can be recorded in a deposito, changed or deleted; the transfers that opening and Move money make are the exception, and they can't be edited or deleted afterwards (their rows in Transactions have no Edit or Delete). The transaction form, Quick add and a goal's "Money comes from" never offer a deposito (a goal saved in a deposito can only say "it's already there"). A deposito can be deleted (with the usual undo); the other wallet keeps its balance as it stands.
- **Renewing:** each term ends and the next starts by itself on the same day, with the same rate and the same amount. Interest keeps adding up from the start date (never interest on interest), and it never reads "matured".
- **Known limit:** Insights' total-balance line works backwards from today's balances and the recorded transactions, so a deposito's interest earned since then also shows in earlier days of that line, by a small amount.

### Wallet dialogs

The same dialog as the transaction form: deep-forest scrim, clay error text under the field, and the cursor jumps to the first problem.

- **Add wallet:** Name, an optional Nickname (a plain text box right under the name with the muted hint "A short word Quick add understands, like jago for Bank Jago."; at most 20 characters), Type (a dropdown with an icon for each kind), an optional Note, an optional Starting balance in the big serif amount box (with a hint that it isn't income), then the Colour and Icon pickers.
- **Edit wallet:** Name, Nickname, Note, Colour and Icon. The nickname is not shown on the wallet cards or anywhere else; only Quick add reads it. Problems with it (too long, no letter, already a wallet's name or nickname) appear under the box in the usual clay text and send the cursor to it.
- **Colour and icon pickers:** a "Default" pill first, then the choices. Colours are ten 32px round swatches; the chosen one gets a ring and a check mark (so it isn't colour alone). The Default pill carries a dot of the colour it stands for. Icons are twelve 36px rounded tiles, drawn in the currently chosen colour so what you see is what you get; the chosen one is filled and outlined. They are real radio buttons, so arrow keys work, and every choice has a name for screen readers.
- **Update value / Correct balance:** one dialog with two wordings. A short explanation that it isn't income or spending, a quiet "Current value" (or "Current balance") row that follows the eye (dots while hidden), the amount box, left empty on purpose so pressing Enter by accident saves nothing, and under it the live change line ("+Rp 120.000 from the current value" in green, "−Rp 25.000 from the current balance" in clay, "+Rp 140.070.000 (+908%) ..." when it is a big jump; a percentage appears from 1% up). The line is left out while the balance is hidden.
- **History:** the wallet's name and "history" as the title, a one-line explanation, then (from two entries on) a 176px line chart of the balance after each update: forest line, small hollow dots, no numbers down the side, a tooltip with the date, balance and change, and dates along the bottom. Under it a list divided by hairlines, newest first: date and "Value update" or "Balance correction" on the left, the new balance in serif and the change in green or clay on the right. It scrolls after about five rows. While the balance is hidden the chart goes and amounts are dots. The chart is hidden from screen readers and has no tab stop, like the donut.
- **Delete wallet:** the title asks "Delete BCA?" with "You can undo it for 10 seconds afterwards.", then a short bullet list of what will go (the wallet and its balance leave the total; its N transactions; how many are transfers with another wallet, whose balances stay), then a box labelled `To confirm, type "Delete BCA"`. The clay "Delete wallet" button stays faded until the text matches (capitals and spaces don't matter). When a wallet can't be deleted (it is the last one, or a goal is saved in it) the dialog says so and has only a Close button. When goals are in the way it names them, says "Move it to another wallet on the Goals page first." and puts a primary "Go to Goals" link next to Close.
- **Reorder wallets:** a list of rows, each with a grip handle, the wallet badge (40px), the name, and up and down arrows (off at the ends). "Save order" is faded until something moves.

### Goal card (Goals page)

A white card like the wallet card (20-24px padding), with no link and no eye. Top row: a 44px sage badge holding the goal's icon, the name in medium weight (it wraps), "Saved in Superbank" under it in small muted text, and the round "more" button at the far right (Edit goal, History, then a hairline and Delete goal in clay). Under that the saved amount at `type-amount` with the percentage at the right end of the same line, the 6px bar, and a muted line with "of Rp 30.000.000" on the left and "Rp 11.500.000 to go" on the right. The percentage never reads 100% before the goal is reached (99.6% reads 99%), and a sliver under 1% reads "<1%".

Pinned to the bottom, so the buttons line up across a row: the pace note (next section), then, with a target date, the monthly figure in medium weight ("Rp 1.916.667 a month") and under it, muted, "to reach it by 31 Mar 2027 · 6 months left", with "Add money" (the sand secondary button) at the right. Months are counted whole, rounded down and never fewer than one, so the figure is never too small. The date stays in one piece when the line wraps, and the dot stays with it. A date that has gone by reads "The target date was 15 Jan 2026." in muted text, with no figure and no alarm. A goal with no date shows only the button. Under 640px "Add money" is a full-width button below the text.

### Pace note

One line above the monthly figure. It is only there for a goal that has a target date, is still being saved for and has been going for at least a day. It compares what has been saved since the goal began (or since money was last taken out) with an even pace to the date. **On pace:** a small trending-up arrow and "On pace" in medium weight, in the `positive` green, the same calm good news as a green bar. **A little behind:** a small clock, "A little behind" in the normal text colour, then "· about Rp 3.179.000 to catch up" in muted text. It is never red and never says "late" or "overdue", because the date can always be moved. A goal within a tenth of where it should be counts as on pace, so a day or two of lag never reads as a warning, and the figure is rounded up to the next Rp 1.000 because it is an estimate. The icons are decorative.

### Reached goal

The percentage becomes a small sage chip with a check, "Goal reached", and the bar is full and green (`positive`: 5.2:1 against the light track, 6.7:1 in dark). The right end of the caption line reads "Reached on 30 Sep 2026" in place of "to go" (nothing when the date isn't known, as for a goal reached before dates were kept), and the subtitle still says which wallet holds the money. The monthly line, the pace note and "Add money" are gone. At the bottom right sits a quiet outlined "Take money out" button (full width under 640px), for when the money is spent. Taking some out, or raising the target in Edit goal, brings the goal back to in progress. Orange stays for goals still being saved for, green means done. Reached goals sort after the others on Home, and a goal saved past its target still reads as reached.

### Completed section

Under the goals still being saved for, a plain text button with a chevron: "Completed (2)". It is muted and darkens on hover, the chevron turns a quarter when it is open, and it starts folded. Opened, the reached goals appear in the same one- or two-column grid. It is left out when nothing has been reached. When every goal has been reached the main area says "Every goal is fully funded. Add another when you think of one." in a plain white card. A goal that moves in or out of the fold (money added, taken out, or an edit) takes keyboard focus with it: to its "more" button when it is showing, otherwise to the fold button.

### Money box (Add money and Take money out)

A popover, not a dialog, so the card stays in view: 336px wide (never wider than the window minus 40px, and kept 12px from its edges), opening from the goal's button. The title is "Add money" or "Take money out" in medium weight, with "to Emergency fund" or "from Emergency fund" under it in muted text. Then a two-part switch, **Add | Take out**: a muted pill with the chosen side raised in white; the arrow keys change it and focus stays on it; a reached goal's box has no switch because it can only take money out. Then the big serif amount box (focused, and empty so a stray Enter saves nothing), labelled "Amount" or "Amount to take out". The line under it says what will happen. Before an amount is typed: "This only updates the goal. It doesn't move money between your wallets." when adding from the goal's own wallet, "BCA to Superbank, saved as a transfer." when another wallet is chosen, and "The money stays in Superbank. This only changes the goal." when taking out. After: "That makes Rp 20.500.000 of Rp 30.000.000 (68%)." or "That leaves ...", or, in green, "This reaches your target." Taking out more than is saved says "Only Rp 18.500.000 is saved for this goal." When adding there is one more field, "Money comes from": "It's already in Superbank" (the default) and every other wallet with its badge. Cancel and Add (or Take out) sit at the right. Enter saves, Escape closes, a failed save keeps the box open with the amount, and focus goes back to the button, or to wherever the card moved.

### Goal dialogs

The same dialog as the wallet form. **Add goal / Edit goal:** Name; Target amount and Saved so far (optional) in the big serif amount boxes; Saved in (a wallet dropdown, which is also how a goal is moved to another wallet); Target date (optional: a calendar with the days before today greyed out and a "Clear date" button, and the hint "Add one to see how much to save each month."); and twelve icon tiles in two rows of six, drawn in the badge's green. Editing shows a hint under Saved so far: "To add new savings, use Add money on the goal's card. A change made to "Saved so far" here is kept in the goal's history as "Corrected by hand"." **Delete goal:** the plain confirm dialog used for transactions: "Delete this goal?", "Japan in spring will be removed. The Rp 6.350.000 you saved for it stays in Superbank." (the second sentence is left out when nothing was saved), with "Keep it" focused and a clay "Delete goal".

### Goal history

Opened from "History" in the goal's menu. The same dialog as the wallet history: the goal's name and "history" as the title, "Every time what you have saved for this goal changed. Rp 18.500.000 of Rp 30.000.000 so far.", then, from two entries on, a 176px chart of what was saved after each change: an orange line (`highlight`) with a soft fill, small hollow dots, no numbers down the side, the target as the top of the chart so the gap still to fill is part of the picture, dates along the bottom and a tooltip with the date, amount and change. Under it a list divided by hairlines, newest first, scrolling after about five rows: the date on the left with "Started with", "Added", "Taken out" or "Corrected by hand" under it (an addition that came from another wallet gets a small transfer icon and "moved from BCA"), and on the right the saved amount in serif with the change in green or clay. Empty: "Nothing yet. Use Add money on the card, and every change will be listed here." The chart is hidden from screen readers and has no tab stop, like the other charts.

### Reorder goals

The same dialog as Reorder wallets: "Reorder goals", "Drag the handle, or use the arrows. This is the order here and on Home. Goals you have reached still go last.", then one row per goal with a grip handle, the 40px sage icon badge, the name and up and down arrows (off at the ends), and "Save order", faded until something moves.

### Goals empty state

The same look as the Transactions empty state: the celengan drawing (once, a coin drops into its slot and the pig gives a small squash; after that a coin waits above the slot), "What are you saving for?", "A trip, a new laptop, a rainy-day fund. Give it a target and add money as you go." and a primary "Create your first goal".

### Undo after a delete

Deleting a transaction, a wallet or a goal shows the same kind of message as deleting a category: a title ("Transaction deleted", "Wallet deleted", "Goal deleted"), a line saying what it was (a transaction's recap, "−Rp 215.000 · Food"; a wallet's name and how many transactions went with it; a goal's name) and a dark **Undo** button, for ten seconds. Pressing it puts everything back and says so ("Transaction restored", "Wallet restored", "Goal restored"). A transaction comes back with the same effect on its wallet's balance and is brought into view even when it is an old one; a goal comes back with its history, its pace, the date it was reached and its place in the list; a wallet comes back with its balance, its place, all its transactions (transfers with other wallets included, which never move those wallets' balances) and the balances set by hand for it. A restored row, card or goal eases in like a new one, and on a phone the page scrolls to it. If something has changed so that it can't be put back ("You have another wallet called BCA now, so that can't be undone."), a message says so ("Couldn't undo that") and nothing is touched. Two deletes in a row each have their own Undo: the messages stack, and pointing at them spreads them out. The box for deleting a wallet no longer says it can't be undone: it says "You can undo it for 10 seconds afterwards." and still asks for the wallet's name to be typed.

### Category row (Categories page)

A row inside a Panel, divided from the next by a hairline. Left to right: the category's round badge (40px, its icon in its colour, the same soft tint and icon colour as the wallet badge), a block of text, and a 40px slot at the far right for the "more" menu (empty on an income preset, so amounts still line up).

The text block is the name in medium weight (it wraps), a small muted lock after it on a preset (with a hover hint, and the words "Preset. It can't be renamed or deleted." for screen readers; the lock is not a tab stop), and the month's amount. The amount follows the money-direction rule: spending is clay with "−", income is green with "+", and when nothing happened that month it reads a muted "Rp 0" with no sign. A spending category with a budget has its budget bar under that (see Budget bar). There are no totals, shares, counts or comparisons here: they are on Insights.

The amount sits at the right of the name when the row is wide enough for both (a container query, about 28rem), and under the name when it isn't: on a phone, at about 768px (where the sidebar has just appeared and taken room), and in the two-column layout of a laptop narrower than about 1380px. It is the row's own width that decides, not the window's, so a name never breaks in the middle of a word ("Entertainme / nt" did at 390px when both shared a line).

The whole row is a link to that category's transactions for the month shown, so Transactions opens filtered to it and the list adds up to the amount. As on the wallet card, the name is the link and an invisible overlay stretches it over the row: the name is underlined on hover (the only hint), and keyboard focus draws the 2px ring around the row. The "more" button sits above the link and works on its own. A category that was just added eases in, and on a phone the page scrolls to it.

### Category card header

Under the card title, a quiet caption names the month the amounts are for ("Spent in September 2026", "Earned in September 2026"): the month Home shows. Totals and comparisons with other months are on the Insights page.

### Month switcher

Used at the top of Insights. A pill (40px high, white, with a hairline and `shadow-xs`) with a chevron button on each side of the month and year ("September 2026"). It starts on the month Home shows and steps one month at a time, from the month of the first transaction up to this month (or the month of the last transaction, if that is later); at either end the arrow is dimmed and can't be pressed, and keyboard focus moves to the other arrow (after the page has been redrawn, because that arrow may only come on with the same step) instead of being lost. The same pill, built once, is the Year switcher. The buttons are named for where they go ("Previous month, August 2026") and the label is announced politely when it changes. The pill keeps its natural width. The month chosen is written into the address (`?month=2026-09`, without adding to the Back button's history) and read from it when the page opens, so Back from a transaction list lands on the same month; an impossible month, or one outside the range, is ignored.

### Budget bar

For a spending category with a budget, on the Categories page (under the row's amount) and on Insights (in the Budgets panel): the standard thin bar (6px sand track, orange fill), and one quiet line under it. On the left the percentage and the budget ("61% of Rp 500.000"), on the right what is left ("Rp 196.000 left", or "Nothing left" once it is used up). Past the budget the bar is simply full, the percentage reads on past 100 ("110% of Rp 300.000") and the right side becomes "Rp 29.000 over" in the muted clay: the same calm brick as any spending, never bright red, with no banner and no alarm. The percentage never says 100 before the budget is really used up (99.6% reads "99%"), and a sliver reads "<1%", as on goals. The bar is a real progress bar with its own name ("Food budget") and a spoken value ("101% of the budget used"). The budget is the same every month and is set against whichever month is shown. It is one component (`BudgetBar`), so the two pages always say the same thing.

### Whole month row (Categories page)

The first row of the Expense categories card: everything spent in the month shown, with the budget for the whole month under it. It is laid out like a category row (a 40px badge, the name as a link over the whole row, the amount in the muted clay, or a muted "Rp 0", at the right of the name or under it when the row is narrow, and the 40px slot for the "more" button), but it is not a category, so its badge is the round sage one the stat cards use (a gauge icon), never one of the ten category colours, and it has no lock. Its name, "Whole month", leads to all of that month's spending in Transactions (`/transactions?type=expense&month=2026-09`), so the list adds up to the number beside it.

With a budget it shows the Budget bar, named "Whole month budget" for screen readers. Without one it shows, in the bar's place, a quiet text button: "Set a budget for the whole month" (muted, underlined on hover, above the row's link so it works on its own). Its menu has one item, "Set monthly budget" ("Change monthly budget" once there is one), which opens the Budget dialog; "Remove budget" is in that dialog. After the dialog closes keyboard focus goes back to where it came from, or to the row's "more" button when the "set a budget" button has given way to the bar.

### Category menu

The wallet menu's panel. A category of the owner's own: Edit category, Set monthly budget (Change monthly budget once it has one), then a hairline and Delete category in clay. A spending preset: only the budget item, because a preset has nothing to edit or delete. An income preset has no menu. Income categories never have the budget item.

### Category dialogs

The same dialog as the wallet and goal forms (28rem wide). **Add category:** a two-part Expense | Income switch, built like the transaction form's from real radio buttons (the chosen side is raised in white, its label tinted clay or green); Name (focused, 30 characters, with an example as its placeholder: "e.g. Coffee", or "e.g. Freelance" on Income); Colour, the ten palette swatches at 32px, in one row from 640px and two rows of five below, the chosen one ringed and checked; and Icon, 24 tiles drawn in the chosen colour (what you see is what you get), three rows of eight from 640px and four rows of six below, each a real radio button with a name for screen readers. There is no "Default" choice: a new category starts on the plain tag icon and the colour the fewest categories of that kind use. **Edit category:** the same without the switch, because whether a category is for spending or income can't change. Errors are plain English under the name ("You already have an expense category called Food.") and the cursor jumps to it. Switching the kind clears a name error, since the name may not clash with the other kind.

**Delete category:** the plain confirm dialog used for goals. "Delete this category?", then "Groceries will be removed. Its 3 transactions move to Other, so nothing is lost and no balance changes." ("Its 1 transaction moves...", or "It has no transactions."), with "Keep it" focused and a clay "Delete category". Afterwards focus goes to the Add button, because the row it was on is gone. The message that follows ("Category deleted", with how many transactions moved to Other) stays for ten seconds and has an **Undo** button: it puts the category back with its budget, its place in the list and its transactions, says "Category restored", and the row eases in and is scrolled to if needed. If its name has been taken, or one of its transactions has been changed since, a message says so ("Couldn't undo that") and nothing is touched. Two deletes in a row each have their own Undo (the messages stack; pointing at them spreads them out), and either can be undone first.

**Add category, from inside the transaction form:** the same dialog opened on top of the form. The Expense | Income switch is left out, because the kind is already known, and a visible line under the title says which it is ("A new category for spending." or "...for income.").

**Budget dialog:** the title is "Budget for Food" (the name wraps), then "The most you want to spend on it in a month. It is only a guide: nothing stops you going over.", then one big serif amount box labelled "Budget per month" (focused, and filled in with the current budget), and a hint under it: "You spent Rp 304.000 on it in September." (the month shown; left out when nothing was spent). The footer has "Remove budget" at the left (only when there is one), and Cancel and "Save budget" at the right. Errors are plain English under the box ("Enter the most you want to spend in a month.", "The budget must be more than zero.") and the cursor jumps back to it. The same dialog serves the budget for the whole month: its title is "Budget for the whole month", it says "The most you want to spend in a month, on everything together. It is only a guide: nothing stops you going over.", and its hint reads "You spent Rp 6.245.200 in September." (without "on it").

**Reorder categories:** the same dialog as Reorder wallets and Reorder goals, with two lists under small muted headings, "Expense categories" and "Income categories". Each row has a grip handle, the category's badge, its name (a small lock after a preset's) and up and down arrows (off at the ends of a list). Its help text says to drag the handle or use the arrows, that this is the order here and in every list of categories, and that presets can move too, so "Other" can go last. "Save order" is faded until something moves, and the two lists are saved together. The dialog scrolls when the lists are taller than the screen.

### Insights toolbar and views

A row that wraps: the view switch (a Segmented switch: Month | Compare | Year), then the period switcher, and "Export" at the far right. The period switcher is the Month switcher on Month and Compare, and a Year switcher (the same pill, "Previous year, 2025") on Year. What is chosen is written in the address and read from it when the page opens: `/insights?month=2026-08` for the Month view (the usual choices are left out), `?view=compare&month=2026-09&with=2026-08` (or `with=year` for the same month a year earlier; "the month before" is the default and is left out) and `?view=year&year=2026`. Anything that doesn't make sense is ignored, and changing a choice never adds a step to the Back button's history. Switching views keeps the month: Compare starts from it and Year goes to its year.

### Segmented switch

A pill (`bg-muted`, 4px padding) of two or three choices, built from real radio buttons, so the arrow keys move between them and a screen reader says "1 of 3". The chosen one is raised in white (`bg-card`, `shadow-sm`) with darker text, the others are quiet, each is 36px high, and keyboard focus draws the 2px ring. On a narrow screen the text and the padding are a little smaller (13px and 10px) so three choices fit in 240px. It is used for the Insights views and for the chart's three views.

### Insights stat cards

The standard Stat card, three of them: Spent (an up-right arrow), Earned (a down-left arrow) and Left over (a piggy bank). The number is the serif amount: Spent in clay with "−", Earned in green with "+", Left over green (or clay if it went negative), and a muted "Rp 0" when there is nothing. The one line under it says how it compares with the month before in plain words ("Rp 570.300 less than in August", "Same as in August") and is always muted: more or less is not good or bad news in itself. It is left out for the first month and when both months were empty. On the Year view the same three compare with the year before ("Rp 6.007.000 less than in 2025"), and there is a fourth, "Average month" (a calendar icon): what was spent per month on average, over the months of the year that have transactions, with "Spent, over 3 months with transactions" under it.

### Month chart

A Panel titled "Month by month", its caption naming the months shown ("July 2026 to October 2026"), then a Segmented switch, "Totals | Categories | Savings", then the chart (Recharts, 240px tall and 288px from 768px), then a legend.

**Totals** puts income next to spending for each month (moss and sand, the neutral pair from the named rules). **Categories** stacks each month's spending, each category in its own palette colour with a 1px card-coloured line between segments, the biggest category (over the months shown) at the bottom. **Savings** draws the share of each month's income that was kept, (income − spending) ÷ income, as a line in the app's own green: a ring at each month, and a filled, larger dot and a faint dashed line for the chosen month, over a quiet baseline at 0%. A month with no income has no point (the line breaks there) and its tooltip says there is no share to show; a month with more spent than earned sits below the baseline and reads with a minus ("−136% of income"). A quiet sentence under the legend says what the line is.

In the two bar views the chosen month sits on a soft sage band and its label is bold; the other labels are quiet. A year is written under the first month and under every January. There are no numbers down the side: amounts are in the tooltip (hover, or tap) and in the cards above. The tooltip shows the month's name, then Income, Spending and Left over (Totals), the categories biggest first and "Total spent" (Categories), or what was kept, left over and earned (Savings). Clicking or tapping a month picks it for the whole page.

It shows up to 12 months, and fewer on a narrow screen: each month needs 38px, so a phone at 320px shows 6 and a laptop shows all 12, and no two labels ever touch. On the Year view it shows exactly the twelve months of the year with none chosen, clicking one opens it in the Month view, and where twelve don't fit (under about 450px) each month is one letter. The legend under it is a wrapping row of swatch and name. The chart is a picture only: it is hidden from screen readers, who get the same figures as a visually hidden table (which changes with the view), and it has no tab stop, because the arrows already change the month.

### Category breakdown row (Insights)

Used in "Spending by category" and "Income by category", for a month and for a year. Like a category row, but ranked: only categories that had something in the period, biggest first (a tie keeps the owner's order). Badge, then the name (with a small lock on a preset), the amount in clay with "−" or green with "+", and the share beside it ("51%", "<1%") in a fixed-width column so they line up. Under the name, in quiet 14px type, how many transactions and, after a dot, how it compares with the period before ("2 transactions · Rp 135.000 more than in August"; for a year, "…than in 2025"). Under that, a bar of the share: 8px, the category's own colour on the track, never narrower than a sliver so a tiny share still shows. The bar is only a picture, because the share is also text. The whole row is a link to that category's transactions for the month (or the year), with the same hover underline and row-wide focus ring as on Categories. There is no menu: managing categories stays on the Categories page. The amount sits under the name when the row is narrow, by the same container query. The same row (`RankedRow`) is used for wallets.

### Biggest expenses, wallets and days of the week (Insights)

Three more panels on the Month view. **Biggest expenses** lists the five biggest single expenses of the month, biggest first (the later day first when two are the same), as the Home "Recent transactions" rows: category icon, what it was, "Category · Wallet", the date and the amount in clay; "See all" opens the month's transactions. **Spending by wallet** ranks the wallets that paid something, with the wallet's own badge, its amount, share and number of payments, and a bar in the wallet's colour; the rows are not links, because a wallet's transactions also include its income and transfers, so the list would not add up to the number. **Spending by day of the week** has seven lines, Monday first: the day's name, what was spent on it in clay (a muted "Rp 0" when nothing), and a bar measured against the busiest day, which the caption names. A transaction counts on the day written on it, whatever the computer's time zone. Each panel says "Nothing spent this month." when the month is empty.

### Total balance panel (Insights)

A Panel titled "Total balance", across the full width, right under the "Month by month" chart on the Month view and under the chart on the Year view. Its caption names the period ("September 2026", or "2026"). At the far right of its header is the round eye button, the same one as on the Total balance card and with the same choice: hiding the total here hides it on Home and Wallets too, and the other way round.

The body: the total at the end of the period in `type-amount`; under it, in muted `text-sm`, the day it is for ("On 30 Sep 2026") and, after a dot, how it compares with the first day drawn, in plain words and never coloured ("Rp 12.254.800 more than on 1 Sep", "Rp 600.000 less than on 1 Sep" or "Same as on 1 Sep"; the dates keep their words together when the line wraps). Then one line chart, 176px tall (208px from 768px): the app's own green (`primary`), 2px, smoothed, with no dots and no numbers down the side (the figure and the tooltip carry the amounts), a faint cursor line and a filled dot on the day under the pointer, and a tooltip with the day ("Tuesday, 15 Sep 2026") and the total for it. Along the bottom is a label every seventh day on the Month view ("1 Sep", "8 Sep") and one for each month on the Year view ("Jul", "Aug"). Under it a muted line says how it is worked out: "Worked out from today's balances, your transactions and any balances you set by hand."

The line has one point per day. It starts on the day of the first recorded change (nothing is known before that) and stops at today. A transfer between two wallets never moves it; a balance set by hand does, on its own day. The chart is a picture only: it is hidden from screen readers (who get the same figures as a visually hidden table in a box of its own, every day of a month or the last day of each month of a year) and has no tab stop. While the total balance is hidden the figure is dots and the comparison, the line, the note and the table are left out of the page altogether (the server doesn't send them), and a quiet sentence says why: "The line is hidden while your total balance is." With nothing recorded for the period it says "There is nothing to draw for this period yet."

### Average spending by day of the week (Insights, Year view)

The Month view's "Spending by day of the week" panel, for a typical day over a year. Its title is "Average spending by day of the week" and its caption "2026 · average over 3 months with transactions · busiest day: Sunday". Seven lines, Monday first: the day's name, what a typical such day cost in clay (a muted "Rp 0" for a day with nothing) and the same sand bar, measured against the busiest day. A typical Monday is everything spent on Mondays in the months counted divided by how many Mondays there were in them. Only the months of the year that have transactions count (as in the average month); a month still going only counts up to today, and spending dated after today is left out. It sits under "Income by category" in the right-hand column from 1280px, and last of the three when they stack.

### Needs a category (Categories page)

A Panel under the Income categories card on the Categories page (in the Income card's column from 1280px, where it fills the space the shorter card leaves, and at the very bottom of the page when the cards are stacked), only there while something is filed under "Other": most of the time the page is just the two lists, and as it is not urgent it is not at the top. Its caption says what it is: "These are in “Other”. Choose where each one belongs." Up to five rows, the newest first, spending and income together: the Other badge, what it was (its note, or "Other"), the amount (clay with "−", or green with "+"), the date and the wallet, and under them a small outline button, "Choose category", that opens a menu of the right kind of categories (spending ones for spending, income ones for income, never "Other") with their icons, scrolling when it is long. Choosing one files the transaction there at once and a message says where it went ("Moved to Shopping", with what it was, its amount and wallet). The row goes, the next one comes up, and keyboard focus lands on the button where the row was (or on the Add category button when the panel is gone, as after a delete). If more than five are waiting, a line under the list says how many more and links to them in Transactions ("See spending in Transactions", "See income in Transactions", only for a kind that has more). A failed save says so and keeps the row. The rows are in one column with hairlines between them, and the panel is as wide as the Income card above it, 24px under it. The amount sits under the name when the panel is narrow, by the same container query as the lists. A category that is deleted sends its transactions to Other, so they show up here at once, and Undo takes them away again.

### Compare table

The Compare view is one Panel, "Compare two months", its caption naming both months. A button, "Compare with August 2026", opens a menu: a label ("Compare September 2026 with"), the choices "The month before" and "The same month last year" (each with its month at the right; dimmed when there is no history that far back), a hairline, "Or pick any month" and every other month with transactions, newest first, scrolling when long. The chosen one carries a check mark. The month before and last year follow the first month when it moves; a month picked by name stays put.

Below it are up to three tables: "Totals" (Spent, Earned, Left over), "Spending by category" and "Income by category" (only the categories that had something in either month, the bigger first). Each line has the name, the first month's amount, the second month's amount (written like everywhere else: clay with "−", green with "+", a muted "Rp 0") and the difference in plain words ("Rp 162.000 more", "Rp 154.000 less", "Same", or a dash), always quiet and never coloured. They are real tables for assistive technology (a table, rows, row headers, cells and column headers). On a wide row (a container query, about 36rem) the columns are Name, the first month, the second month and Difference, under one header row; on a narrow one each line stacks: the name, the two amounts side by side each under its month's name, then the difference. When the other month isn't in the history (for example the month before the first transaction) a sentence says so instead of a table.

### Year view

A Year switcher, four stat cards (see Insights stat cards), the Month chart for the twelve months, "The year in numbers", then "Spending by category" beside "Income by category" for the whole year. **The year in numbers** is a table with a line for each month (its name is a button that opens that month in the Month view, but only for a month that has transactions), then "Average month" and "Whole year", set on a faint tint: Spent (clay), Earned (green), Left over (green or clay) and Kept (the share of income kept, "58%", or "−12%"). A month with nothing in it is dashes on a wide screen and a single quiet "No transactions" on a narrow one, so a phone doesn't scroll through nine empty grids. The average line is the whole year divided by the months that have transactions. On a narrow row each line stacks as in the Compare table.

### Export menu

An outline "Export" button (a download icon) with a short menu: a label "Save as a CSV file", then the month on screen ("September 2026") and the whole year ("All of 2026"), each with how many transactions it holds at the right; one with nothing in it is dimmed. On the Year view only the year is offered. Choosing one saves a file named `nabungbego-2026-09.csv` (or `nabungbego-2026.csv`) and a message says so ("File saved", with the file name and the count). The file has the columns Date (2026-09-29), Type (Income, Expense or Transfer), Category, Wallet, To wallet (only for a transfer), Note and Amount, oldest first. The amount is a plain whole number, so a spreadsheet can add it up: income positive, spending negative, a transfer as it is. Lines end with a carriage return and a line feed, the file starts with a byte order mark so accents and symbols read correctly, a note with a comma, a quote or a line break is put in quotes, and a note that starts with = + - or @ gets a quote mark in front so a spreadsheet shows it as text instead of running it as a formula.

### Budgets panel (Insights and Home)

Lists the spending categories that have a budget, in the owner's order, each as a Budget row: badge, name (a link to the month's transactions), what was spent that month at the right (clay with "−", or a muted "Rp 0"), then the Budget bar. The budget for the whole month, when there is one, comes first, as the same kind of row with the sage badge and the name "Whole month" (a link to all of that month's spending). On Insights it is a panel in the right-hand column; with no budgets it says, quietly: "No budgets yet. Choose "Set monthly budget" in a spending category's menu on the Categories page." with a link to that page. On Home it is a full-width panel with a "See all" link to Insights, its rows in two columns from 1280px, and it is only there when at least one budget exists (a category's, or the one for the whole month).

### Month recap (Insights)

`components/insights/month-recap.tsx`. The first thing under the toolbar on the Month view. A white card (18px radius, hairline, `shadow-sm`, 20px padding, 24px from 768px; not tinted, because the Total balance card is the only tinted one) with the title "September in one look" in `type-title` (with the year for a month of another year) and a list of facts. Each fact is a 14px muted label above its figure in the serif amount style: **Came in** (green, with "+"), **Went out** (clay, with "−"), **Left over** (green, clay when negative, muted at zero) and **Biggest treat**: the amount in clay, then what it was in 14px medium and its day in 14px muted. One column under 380px, two from 380px (24px figures on a phone), four from 1280px (three when there is no treat). The round Seal sits in the top right corner, partly cropped by the card, from 768px (not on a phone), behind the words and above the first row of figures, never under an amount (a test measures the boxes). Its numbers repeat the three cards below it on purpose: it is the one-look version.

With no money in the month it is a centred card instead (the same as the other empty states): the calendar drawing, "Nothing came in or went out in October yet" ("yet" only for a month that isn't over), "Add a transaction and this page fills in." and a secondary "Go to Transactions" link.

### Monthly note (Insights and Home)

`components/monthly-note.tsx`. A white card (same shell as the month recap) titled "Monthly note" with the month under it and, at the right, two 40px round ghost arrows. Under that a horizontal scroll-snap track of up to three slides: a small muted title ("September", "Worth noticing", "Progress") over one to three sentences in `type-title` at normal weight (18px on a phone), then three dots (the current one a longer forest pill, never orange). Swipe on touch, arrows or dots otherwise; the arrows use `aria-disabled` at the ends so focus isn't lost. The track is focusable and every slide is plain text, so a screen reader reads all three. It never nests a card, never uses colour for good or bad news, and never mentions a wallet or the total balance. On Insights it sits right under the month recap; on Home, before Budgets. Left out when the month has no money.

### Twelve coins (Insights, Year view)

`components/insights/year-coins.tsx`. A Panel, "Months that kept money", with the caption "A coin for each month that kept some money.", under the four cards. Twelve items, January to December, in 12 columns from a panel width of about 36rem (1024px and up) and 6 below (two rows of six). Each is a 36px disc over its three-letter month. A month that kept money (more came in than went out; transfers never count) is a coin: `bg-highlight` with the milled rim (`coin-rim`, in dark dots). Every other month is an empty ring: 2px dashed, `muted-foreground` at 75% (3.3:1 against the card in light mode and 4.6:1 in dark, checked, because it is a mark that carries meaning), the same dashed ring as in the drawings. The discs and rings are `aria-hidden`; each month is also said in words for screen readers ("July: kept some money", "January: no coin"). There is no count, no streak and no wording about the months without a coin.

### Below-zero heads-up (transaction form)

Under the Amount box, where a hint goes (muted 14px text): a 16px clay alert mark and "This takes Bank Jago below zero. You can still save it." It appears as soon as the typed amount would take the chosen wallet (for a transfer, the one it leaves) below zero and lower than it is now, and goes when it wouldn't. It is a polite `role="status"`, not an error: no clay words, no red field, and "Add transaction" and Enter work exactly as before. It never shows for income or for the wallet a transfer goes into, and not while that wallet's balance is hidden.

### Messages that name a balance

The messages after a transaction is added, saved, deleted or brought back, and after money is added to a goal from another wallet, have the balance as a second line (a block of its own): "BCA is now Rp 8.642.300.", one sentence for each wallet involved, the new wallet first when an edit moved the transaction ("Superbank is now Rp 24.750.000. BCA is now Rp 8.692.300."). A wallet whose eye is closed reads "BCA's balance is updated." with no number in it. The goal message reads "Added Rp 10.000. Emergency fund now has Rp 18.510.000 of Rp 30.000.000. Moved from BCA. BCA is now Rp 8.681.300. Superbank is now Rp 24.760.000."

### Milestone messages

When "Add money" takes a goal past 25%, 50% or 75% of its target (by the percentage on the card, so 24.9% reads, and counts as, 25%), the message uses the "Goal reached" message's frame: the small celengan as its icon (the same still drawing, 40px), a title ("A quarter of the way", "Halfway there" or "Three quarters of the way") and "Added Rp 100.000. Steps goal now has Rp 300.000 of Rp 1.000.000." No coin shower and no sound. Only the highest mark passed is said, never the same mark twice, and reaching the goal still gets "Goal reached" and the shower.

### Empty lists from a wallet or a category (Transactions)

Opened from a wallet card, or from a category row or link with nothing in it, and with no other filter, the list's empty card says what it is about: the wallet drawing with "Nothing in Cash in drawer yet" and a primary "Add transaction", or the price tag with "Nothing in Other in September 2026" ("in 2026" for exactly one year, "yet" without dates) and a secondary "Show every transaction". The same card, 176px drawing and wording style as the other empty states. A search, a kind of transaction, a wallet and a category together, a wallet with dates, or any other range keeps "Nothing matches these filters" and the magnifier.

### Page not found

`app/not-found.tsx`. For an address that isn't a page: the usual header with the title "Page not found" and the date pill, then a white card with the magnifier, "We can't find that page", "The address may have a typo, or the page may have moved. Your money is where you left it." and a primary "Go to Home" link with a house icon. It sits inside the app's own layout, so the sidebar is there and no page is marked as the current one.

### Drawings

`components/illustrations/`. Three drawings made for this app, not icons, that stand in for an empty list: a **celengan** (the clay piggy bank people in Indonesia have saved coins in for generations: a flat terracotta pig facing right, a four-petal kawung flower painted on its flank, a coin slot on its back and a coin above it) on the empty Goals page, a **ledger** (an open notebook with a pencil across it) on an empty Transactions list, and a **magnifier** (a lens looking at a question mark, two coins beside it that were not what it wanted) when a search finds nothing. Forest-ink lines (cream in dark mode), terracotta from `--illu-body` (a real clay in both themes: mixing the clay colour with a dark card drifts to olive), paper from the card, an orange coin and two ochre sparkles. They are `aria-hidden`, marked `data-decorative` (so the contrast check skips their lettering) and 176 to 208px wide. The celengan's coin drop and squash run once on first sight; `still` turns them off (the "Goal reached" message and the milestone messages use it).

Step 7 added three more in the same hand (forest-ink lines, terracotta clay, a coin and two sparkles, 176px wide, `aria-hidden` and `data-decorative`): a **wallet** (a clay wallet shut by a coin, a banknote peeking out) for a wallet with nothing in its list, a **calendar page** (two rings, a green header, empty days and a dashed ring where the first coin will land) for a month with nothing in it, and a **price tag** (hanging on its string, two blank lines and a dashed ring) for a category with nothing in it. The magnifier also stands in for a page that isn't found. The paper tone (`--illu-paper-shade`) is now mixed in sRGB: mixed in OKLCH with the card colour, which has no hue of its own, it read as pink; it is now the pale sage it was meant to be (the magnifier's lens, the banknote, the calendar's back sheet).

### The delight layer

One thought runs through it: saving should feel like dropping a coin into a celengan, small, tactile and a little cheeky (Kaya is a nod to "kaya", rich). Coins and the celengan are the recurring shapes, a hint of batik is the texture, and it all lives where money moves or a goal is reached, never in the way of reading a number. Every piece can be taken out on its own.

- **The balance card's engraving.** A `kawung` lattice (four petals round a seed, drawn once as a mask in `--kawung-tile`, so any colour can wear it) at 17% in `sage-foreground`, fading out along `--kawung-fade` from the right edge, and that is all there is now. (A round `Seal` with "Kaya" round the rim and the old K coin in the middle used to sit at its right edge from 768px; the owner had it taken off on 6 Oct 2026 and `seal.tsx` is deleted.)
- **The sidebar's batik.** The `[data-sidebar="sidebar"]` rule in `globals.css`: a pre-coloured tile (`--kawung-tile-cream`) under a gradient that is solid forest above the menu. To remove: delete that rule.
- **Paper grain.** A fine noise (`--grain`, an SVG filter tile at 36% in light mode and 20% in dark) on the page behind the cards. White cards stay clean. To remove: delete the `main[data-slot="sidebar-inset"]` rule.
- **Coin rims** (`coin-rim`, see Shapes).
- **The brand mark turns** when you point at the brand (`animate-coin-flip`, one full turn about the vertical axis). This is the K coin's old flip, kept for now on the Kaya mark; the owner will decide whether to keep it, make it a quarter turn, or remove it.
- **A coin drops into a goal's bar** when more is saved than before (`GoalCard`), and the saved amount's digits pop.
- **The coin shower** when a goal is reached (`lib/celebrate.ts`): 46 pieces, one in four an orange coin with a dotted rim, the rest paper bits in the ten category colours (read from the theme's variables), each with its own fall, drift and spin. They remove themselves after 3.6s. The message that goes with it ("Goal reached", "<name> is fully funded. Nicely saved.") carries a small celengan instead of the usual tick.
- **A sun or moon in the date pill**, by the hour: sunrise from 5, sun from 11, sunset from 17, moon from 20.
- **Soft thousands dots and popping digits** in amounts (see Money).
- **The eye blinks** and the amount fades back in.

The style guide has a Drawings section and a Delight section (a counter whose digits pop, and a button that makes it rain).

### Transactions page

The search box with "Import CSV" and "Add transaction" beside it (the buttons wrap under the search when the room is under about 40rem for all three, and share a row on a phone). Under them are the date range, type, category and wallet filters, a two-by-two grid up to 1279px and one row from 1280px, with "Clear filters" appearing only while something is filtered. Then the totals strip (below). The list is one card: a tinted band per day ("Today, 30 Sep 2026", "Yesterday, ...", "Monday, 28 Sep 2026") with what that day came to at its right end, then that day's rows, edge to edge, divided by hairlines. The search box has our own neutral "×", never the browser's blue one.

A row's buttons, Edit, Duplicate and Delete, are small round icon buttons under the amount, named for screen readers ("Edit Sate and es teh dinner", "Duplicate ..."). With a mouse they are drawn only while the row is pointed at or one of them has the keyboard (the `row-actions` utility: opacity 0 to 1 over 150ms, only where `hover: hover`), so thirty rows aren't thirty rows of icons. They are always in the page for the keyboard, and on a touch screen they aren't drawn: the row is swiped.

**Day total.** At the right end of each day's band, in the band's muted text and tabular figures: that day's income minus its spending with its sign ("−Rp 215.000", "+Rp 12.500.000"). It has no colour: it is a sum, not a transaction. A day that held only transfers has none. Screen readers hear "Net for the day:" first, and the day's group is still named by its date alone.

### Totals strip

One card (the usual white card, hairline, `shadow-sm`) between the filters and the list, holding two things: on the left the line that says what is showing ("Showing 30 of 41 transactions", read out politely when a filter changes it) with, under it in muted text, short facts joined by a dot ("Totals cover all 41. · 6 transfers aren't counted."); on the right three figures, **Money in** (green, "+"), **Money out** (clay, "−") and **Net** (plain ink, with its sign), each a muted 14px label over a `type-figure` number, with a hairline between them. The figures add up every transaction that matches the filters, not only the ones on screen. A transfer isn't in any of them. The layout follows the strip's own width (a container query on a wrapper): below 34rem the three figures sit one under another like a receipt (label left, number right); from 34rem they are three columns; from 50rem the line and the figures share one row. With nothing matching the strip isn't drawn and the usual quiet line stands in.

### Date presets

The date filter's popover opens with three quick ranges as pill chips above the calendar: This month, Last month, Last 3 months. The active one is filled forest (sage in dark mode) and marked `aria-pressed`. Picking one applies it and closes the popover.

### Load more

Under the list, a centred outline button: "Load more" with a muted "(11 left)". The line above the list says what is on screen ("Showing 30 of 41 transactions").

### Swipe actions (touch screens)

Swipe a row left to reveal three full-height buttons, 76px each: Edit (primary: forest, sage in dark mode), Duplicate (the sand secondary) and Delete (clay, with the page background colour as its text so it reads in both themes). Each has an icon over a 12px label. The row springs open past about 45% or on a flick, and springs back otherwise. One row is open at a time. Shown only when the main pointer is a finger (`pointer: coarse`); with a mouse the small inline icons are used instead, never both.

### Transaction form

A dialog. A segmented Income / Expense / Transfer switch (built from real radio buttons, so arrow keys work) whose selected label is tinted green, red or neutral. Then a large serif amount box that adds dots as you type, dropdowns for category and wallet with tinted icons, a calendar date picker, and an optional note. Errors appear under the field in clay text, and the cursor jumps to the first one. The amount is focused on open. Dates always read "30 Sep 2026", with weeks starting on Monday. Behind every dialog is a deep-forest scrim with no blur.

The footer of a new transaction has three buttons: Cancel (ghost), **Save and add another** (the sand secondary) and the primary one; the footer stacks on a phone with the primary on top. "Save and add another" saves and keeps the box open: the kind, the wallet (or wallets) and the date stay, the amount, note and category start over, and the keyboard goes to the amount (in Quick add, back to the one-line box, and the form folds away until the next line is filled). A hidden status line tells a screen reader it saved. There is no such button when editing. **Duplicate** opens the same form titled "Duplicate transaction", with a line under the title ("A copy of “Sate and es teh dinner”, dated today. Change what you like, then save it."), everything copied and the date today; its primary button still reads "Add transaction".

### Quick add (7 Oct 2026)

A round **coin** stays at the bottom right on every page: 44px across, 24px from the right and from the bottom, with phone safe-area insets respected. It is the app's orange (`highlight`, with `highlight-foreground` for the plus), with a 20px plus drawn at 2.25 stroke and the same dotted milled rim (`coin-rim`) as the round badges. It has no word on it. Its name for screen readers is "Quick add", and pointing at it or Tabbing to it shows the usual dark tooltip to its left: "Quick add" and, muted, "Ctrl+K" ("Cmd+K" on a Mac). Closing the box hands the keyboard back to the coin without opening that tooltip.

At rest it has `shadow-md` (on the button, so it stays put) and on hover `shadow-lg`; pointing at it lifts it 3px (the shadow deepens to `shadow-lg` as it rises, 0.2s; nothing spins or flashes); pressing squeezes it to 94%. It sits below dialogs and the mobile menu (`z-30`). Orange is otherwise never a button colour (see "One orange"); this coin is the one exception, because it is the one action every page shares.

The corner is shared, so three things make room: messages (`Toaster`) come from the top right instead (24px down; 72px on a phone, under the top bar), so they never cover the coin; page content has 7rem of bottom padding on a phone and 6rem from 768px, so the last row scrolls clear of the coin; and the small black "N" badge that `next dev` draws is switched off (`devIndicators: false`). The sidebar keeps no space for it: its bottom padding is the usual 24px.

The coin opens the existing transaction dialog at a small first step, titled **Quick add**: a **Your expense** label, a white input with `nasi goreng 25rb BCA` as the placeholder, a sand **Fill form** button and one muted helper line. The input and button stack on phones. The input receives focus. Enter fills the form without saving. The panel uses a faint muted surface, the shared border and rounded corners; errors use the existing field style.

**Shortcut.** Ctrl+K (Cmd+K on a Mac) opens the same dialog from any page, even from a text box; it is the only shortcut and no plain letter opens it. The coin carries `aria-keyshortcuts` ("Control+K Meta+K"). Closing the box puts the keyboard back where it was (the coin when nothing had it).

After filling, the dialog shows the normal **Add transaction** review fields and focuses the amount. The quick-add line stays available for corrections. A polite status message names the matched or retained wallet and asks the owner to review or choose a category. Manually selected categories are preserved. Only the regular final button saves; closing restores focus to where the keyboard was, which is the coin unless Ctrl+K was pressed from somewhere else. The ordinary Add/Edit form keeps its amount-first layout. Everything uses shared light/dark tokens and keyboard focus styles.

### Transaction form: suggestions and "Add new category"

Typing a note suggests a category. The category box fills itself in and a quiet line under it says where the suggestion comes from (it reads: Suggested from your earlier "Kopi Kenangan".). It only ever repeats the owner's own choices for the same kind of money: the very same note, then the start of an earlier note (from three letters, so it works as you type), then a word in common; the category used most often wins, and on a tie the most recent. It never replaces a category picked by hand, it is taken back when the note stops matching, and it isn't offered when editing a transaction or for a transfer. A "Choose a category" complaint goes as soon as a suggestion fills the box.

The category list ends, after a hairline, with "Add new category" (a small round plus in front of it), which opens the Add category dialog on top of the form. Saving picks the new category in the form and gives focus back to the category box; Cancel and Escape leave the form exactly as it was. Typing letters to pick a category can never land on it, because its text value starts with "+".

### Import from a bank's file

`components/transactions/import-dialog.tsx`, `import-row.tsx`, the reading in `lib/bank-csv.ts`. A dialog 42rem wide (`sm:max-w-2xl`) in three small steps that never leave the box.

**Step 1.** Title "Import from a bank's file", one sentence of what it does and that the file stays on this computer. A "Which wallet is it for?" dropdown (never a deposito) and one large dashed drop zone: a sage round icon, "Choose a CSV file" and a muted "or drop it here". It is a real label around a real file input, so it works by keyboard (focus draws the usual ring around the zone) and by dragging. A file that isn't text, or is empty, is refused under the zone in clay, in words, with what to do. A line with a shield icon says the file never leaves the computer and that importing twice adds nothing new.

**Step 2, "Check the lines".** The wallet again ("Import into") with a ghost "Choose another file"; a folded card "How the columns were read" (it opens by itself when the date or amount column couldn't be found) holding a date column, a description column, three ways the amounts are written (a segmented switch: "+ and −", "Out and in apart", "With DB / CR") and the matching column pickers, what a number with no minus sign means (money in or out) and the bank's balance column; changing any of it re-reads the lines at once. Then one card with a header row (a "Select all" tick, with the half-ticked state, and "3 of 5 ticked · 1 already in Kaya · 1 can't be read · 1 other line left out") over a list that scrolls on its own (46svh at most). Each line is a tick, the description, the date, the amount (green "+" or clay "−"; muted when unticked) and its category in the app's own dropdown look (a native `select`, drawn like the others, for a long list on a phone). "From your earlier “Kopi Kenangan”." says where a category was learned. A line the app already has wears a sand chip "Already in Kaya"; one that can't be read says why in clay with a small alert icon and its line number in the file, and its tick is off for good. Under the list, in muted text: what the wallet's balance goes from and to, and the bank's own balance from the file ("That matches." when it does). While the wallet's balance is hidden with the eye this says only that each line changes the balance, as if added by hand. The footer is Cancel and "Import 3 transactions" (it counts the ticked lines and is off at zero).

**After.** A message "Imported 3 transactions" ("Into BCA.") with an Undo button for ten seconds; Undo takes every line of that import out again, gives the balances back and says "Import undone".

### Native select

`components/native-select.tsx`. The browser's own dropdown with the app's look (same height, border, radius, focus ring and a small chevron on the right), used only where a long list would make hundreds of popovers: the category of each imported line and the column pickers. Everything else uses the app's own dropdown.

### The lock screen

`components/lock/lock-screen.tsx`. What the app shows instead of everything while a PIN is set and this device hasn't typed it. A full-height forest-green page (the sidebar's colour in both themes) with the cream batik lattice rising from the bottom edge and fading out (`lock-lattice`), the name "Kaya" in the serif at the top, and one white card (`rounded-xl`, `shadow-lg`, 24 to 28px padding, 24rem wide at most): the title "Kaya is locked" (`type-title`), "Enter your PIN to open it.", the PIN box, a full-width forest "Unlock" button 44px tall, and a muted line ("Forgot it? The PIN can be turned off from the computer that runs Kaya. The README shows how."). Under the card, small and muted, the sprout and "Runs on this computer. Your numbers stay here." There is no mark in the logo spot, because the owner switched the mark off on 7 Oct 2026.

The PIN box (`components/lock/pin-field.tsx`, also used in the PIN dialogs) is a 56px field, drawn like the amount box (white, hairline, the 3px ring on focus), that shows what has been typed as round dots, like a phone's lock screen: four empty rings to begin with, filling with the foreground colour as digits go in, and more rings appearing past four, up to eight. It is one real password input (it asks a phone for its number pad, `inputmode="numeric"`, 16px type so a phone doesn't zoom) drawn invisibly over the dots, so the keyboard, pasting, the browser and screen readers all work as for any box; it keeps digits only. The button is off until four digits are in.

A wrong PIN shakes the dots once (380ms, 7px each way), clears the box, keeps the keyboard in it and says in clay under it, with a small alert icon, "That PIN isn't right. 4 tries left before a short wait." After too many tries the box and the button are off and a muted line counts down ("Too many tries. Try again in 28 seconds."; a screen reader hears "Wait a moment, then try again." once, not the countdown). A right PIN turns the button into "Opening…" while the page behind it takes over (it falls back to reloading the page after 4 seconds if it doesn't). The shake and the countdown stop for "reduce motion" like everything else. Nothing of the app is in the page's HTML while locked.

### PIN settings

`components/lock/pin-dialog.tsx`, opened from the account menu (see Account menu): a "Set a PIN" row without a PIN, and "Lock Kaya" plus "PIN settings" with one. The dialog is 28rem wide. With no PIN it is the form for choosing one: "New PIN" (hint "4 to 8 digits.") and "Type it again" in PIN boxes, and "Turn on PIN lock". With a PIN it opens on "PIN lock is on" with three rows (a sage round icon, a title, a muted hint and a small chevron): "Lock now", "Change PIN" and "Turn off PIN lock", each leading to its form, with "Back". Changing asks for the current PIN, the new one twice and refuses a new PIN that is the old one; turning off asks for the current PIN and has a clay button. A wrong current PIN says so under its own box ("That PIN isn't right. 3 tries left before a short wait.") and empties it. Success is a message ("PIN lock is on", "PIN changed", "PIN lock is off").

### The printable report (Insights)

`components/report/month-report.tsx` (the sheet), `report-view.tsx` (the page around it) and `app/insights/report/page.tsx`. "Report" is an outline printer button beside "Export" on the Month and Compare views of Insights. The page has, above the sheet and not printed: a ghost "Back to Insights", the month switcher and a primary "Print or save as PDF" button (it opens the browser's print window), and a line saying to choose "Save as PDF" there to keep a file. The page's title is "Kaya report September 2026", which is what the browser offers as the PDF's name.

The sheet is `article.paper`, up to 210mm wide, white card colour, `shadow-md` and a hairline ring on a screen, flat and plain white in print. The `paper` class re-declares the light colour tokens (it shares the `:root` block), so in dark mode the sheet is still light paper with dark ink, and what is on screen is what prints. It holds, in order: the name "Kaya" and "Prepared on 9 Oct 2026"; the month in `type-display` and "Monthly report for Mario" (", up to today" for a month still going); **The month at a glance** (three figures in `type-amount`, Earned, Spent, Left over, with hairlines between, each saying how it compares with the month before, and how much of the income was kept); **In words** (the monthly note's slides, the sentences in the serif); **Where it went** (a table: category with its colour dot and how it compares with the month before, how many transactions, a thin share bar with the percentage, the amount); **Budgets** (the same calm bars as elsewhere, two columns; the whole month first); **Where it came from**; **The biggest expenses** (five, with date, what, wallet and amount); **Which wallets paid**; **Where the goals stand today**; and **Every transaction** (date, what and its category, wallet, amount; transfers without a sign, with a line saying so). Section titles are `type-title`. It never shows a wallet's balance, so it needs no hiding. On a phone the tables drop their "Transactions" and "Wallet" columns and the share bar (the wallet moves under the description), so nothing runs off the side.

Printing: `@page` is A4 with 14mm margins; the menu, the Quick add coin, the messages, the top bar and the bar above the sheet are left out (`print-hidden`, which any page can use); the page is plain white; tables repeat their header row on every page and never split a row; a short section never splits, and a long table (spending by category, budgets, every transaction) may run over to the next page, with its title never left behind alone. `print-color-adjust: exact` keeps the bars and the money colours.

### Donut chart

Recharts, drawn from 12 o'clock clockwise, 176px, with "Total spent" in the hole and hover tooltips. Slice colors are the category variables. It is hidden from screen readers and has no tab stop, because the legend beside it lists every slice as text: color dot, name (a long one wraps onto a second line and is never cut short), rupiah and percent. Animation is off for now.

### Rows

Goal row: icon badge, name (it wraps), percent, thin orange bar, "Rp X of Rp Y". A reached goal shows a green check and "Reached" in place of the percent, a green bar, and " · on 30 Sep 2026" at the end of the amounts line once the date is known. On Home the panel lists at most four goals (in progress first), then a hairline and "Rp 164.720.000 left to save across 3 goals" (goals already reached don't count). With no goals it says "No goals yet. Start one on the Goals page." with a link. Transaction row: category icon in its tint, description and amount on line one, "Category · Wallet" and date on line two. Text wraps rather than truncating, so no name or amount is ever cut off. Lists inside a Panel are separated by hairlines.

### Progress

A 6px sand track with an orange fill, always paired with a percentage in text. A reached goal's fill is green. The fill eases over 500ms, and animation is off under reduced motion.

## Do's and Don'ts

### Do:

- Pull every color from a token. Add a token before adding a one-off.
- Put the amount first. Label small, number big.
- Keep dark mode green-tinted. Check new pairs against 4.5:1 for text and 3:1 for marks, in both themes.
- Theme the parts the browser draws: text selection, caret, scrollbars and focus rings are already done in `globals.css`.
- Pair every chart with a text legend, and hide the chart itself from screen readers.

### Don't:

- Don't use gradient text, glass or blur for decoration, or colored side borders on cards.
- Don't add eyebrow or kicker labels above headings.
- Don't use progress rings or sparklines as stand-ins for real content.
- Don't use serif in buttons, labels or table cells.
- Don't put `outline-none` and `focus-visible:outline-2` on the same element. In Tailwind v4 `outline-none` also sets the outline style to none, so the ring never appears. Drop `outline-none` (the global `:focus-visible` rule draws the ring), or draw the ring with `ring-*` or on a pseudo-element.
- Don't give a menu, popover or dropdown its own fixed `max-h-*`. It replaces the shared rule that keeps the box inside the window, and on a phone held sideways its last items can't be reached. Cap it with the window as well: `max-h-[min(20rem,var(--radix-dropdown-menu-content-available-height))]`.
- Don't add a decoration that moves on its own, or one that sits under a number. Fun happens when money moves; the amount stays the clearest thing on the page.
- Don't give a drawing text a reader needs: drawings are `aria-hidden` and `data-decorative`.
- Don't use a bright or saturated red. Spending is the muted clay.

### Rotating greeting
`components/rotating-greeting.tsx`, with the words in `lib/greetings.ts` and the typing steps in `lib/typewriter.ts`. The whole Home greeting, name included ("Good morning, Mario"), types itself in 20 languages: English, Indonesian, Chinese, Korean, Japanese, Javanese, Spanish, French, German, Hindi, Portuguese, Italian, Dutch, Russian, Turkish, Thai, Vietnamese, Tagalog, Malay, Greek, then round again. The page opens with the English line whole (so the first paint is what the server drew). After 2.5 seconds it deletes itself one letter at a time (35ms a letter, quicker than typing), waits 0.3 seconds empty, and types the next language one letter at a time (70ms a letter), then rests 2.5 seconds again. A language takes about 5 seconds, so the whole list takes a minute and a half or two. The name is typed and deleted with the greeting, and follows the owner's name if it is changed while the page is open. It is the same name, as the owner typed it, in every language: the owner decided on 8 Oct 2026 not to have it written in each language's own letters. The part of the day (morning before 12, afternoon before 18, otherwise evening) is worked out on the server as before and picks the words in every language. Letters are cut the way a person sees them (a Thai letter with its mark, a Hindi letter with its vowel sign stay together), so nothing is ever half drawn. Each line carries its language tag (`lang`), so Chinese and Japanese get the right letter shapes. A thin orange bar (the same orange as the cursor in a text box) follows the last letter: solid while letters come and go, blinking while the line rests. It has no width, so it never pushes a word onto the next line. Screen readers hear the English greeting and name once (a hidden copy) and skip the typing. With "reduce motion" on, nothing moves and there is no bar. The words have a line height of 1.3 (the title's is 1.1) so Thai and Hindi marks aren't cut, and they wrap as they come (normal wrapping, not the balanced wrapping other titles use, which would shuffle words about while it types). On a phone the longer greetings wrap onto a second line, so Home's title keeps two lines of height below 768px and the page below never jumps (94px there, 57px on a desktop). The title's font (Source Serif 4) is loaded with the Latin, Latin extended, Vietnamese, Cyrillic and Greek sets; Chinese, Korean, Japanese, Hindi and Thai use the computer's own fonts, so they look different on each system. The speeds are the four numbers at the top of `lib/typewriter.ts`.
