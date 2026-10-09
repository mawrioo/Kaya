# The money pet (design)

Agreed with the owner on 9 Oct 2026, revised the same day after the first drawing: the pet is a cute pig, not a celengan, drawn simply (thick brown outline, flat colour, big oval eyes, stubby legs, no slot, no batik), and its look follows **one thing only: this month's saving rate**. Each state is drastically different, like the owner's reference pictures (a healthy pink creature that turns yellow, sags, and finally melts into a puddle with flies).

## The pet

- One SVG component, `components/mascot/pet.tsx` (`<Pet mood="…" />`), in its own colours (`--pet-*` tokens in `globals.css`). It follows light and dark mode.
- The old flat celengan drawing (`components/illustrations/celengan.tsx`) stays where it is (the empty Goals page, the "Goal reached" message) until the owner decides.

## Its five states, from the saving rate

Saving rate = (income − spending) ÷ income for the calendar month, the same numbers Insights and Home show. Transfers don't count.

| This month | State | Look |
|---|---|---|
| Kept 20% or more | **Thriving** | bright pink, happy closed eyes, a big open smile, sparkles, hops now and then |
| Kept under 20% | **Happy** | pink, round, bright eyes, a smile |
| No income yet (the owner is paid weekly), or break-even | **Okay** | pink, plain face |
| Spent up to 20% more than came in | **Wilting** | turning mustard from one side, saggy body, droopy ears, droopy worried eyes, a frown |
| Spent over 20% more than came in | **Melted** | olive, melted into a puddle (no legs), ears flopped, half-closed eyes with bags, a tear, stink lines and flies |

The bottom states are a deliberate exception to "calm over alarm", asked for by the owner. The words around it never scold. A screen reader hears one plain sentence. The pet shows a state, never a number, so it gives nothing away while balances are hidden.

## Signs of life (an exception to "nothing moves on its own")

- It breathes and blinks at random moments; healthy ears twitch now and then. Thriving hops; Wilting sighs; Melted oozes slowly, its stink lines drift up and its flies buzz.
- Under "reduce motion" none of it runs: the pet sits still in its state.

## Reactions (step 3)

- Its eyes follow the mouse pointer a little; pointing at it or tapping it gives a wiggle; adding money makes it perk up.

## Placement (step 2, to compare)

A "Pet" row in the existing Compare options panel, kept in the browser and settable by a link (`?pet=…`): **None** (today), **By greeting**, **Goals panel + Goals page**, **Sidebar**, **Own card**. The owner chooses later; the panel and the unused placements are then deleted (recorded in ROADMAP.md).

## Build order (stop for the owner's opinion after each)

1. The new pet in its five states, shown on `/styleguide`.
2. The saving-rate logic (`lib/mascot.ts`, pure) and the placements with the Compare options row.
3. The reactions.
