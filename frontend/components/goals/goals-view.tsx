"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUpDown, ChevronRight, Plus } from "lucide-react"

import { CelenganArt } from "@/components/illustrations/celengan"
import { coinShower } from "@/lib/celebrate"
import { toast } from "sonner"

import { useLiveDate } from "@/components/use-live-date"
import { useData } from "@/components/data-provider"
import { GoalSummary } from "@/components/goal-summary"
import { DeleteGoalDialog } from "@/components/goals/delete-goal-dialog"
import { GoalCard, goalMenuId } from "@/components/goals/goal-card"
import { GoalDialog } from "@/components/goals/goal-dialog"
import { GoalHistoryDialog } from "@/components/goals/goal-history-dialog"
import { GoalReorderDialog } from "@/components/goals/goal-reorder-dialog"
import type { MoveMoneyInput } from "@/components/goals/move-money-popover"
import { Button } from "@/components/ui/button"
import { useReturnFocus } from "@/hooks/use-return-focus"
import { errorMessage } from "@/lib/api"
import { toDateInput } from "@/lib/dates"
import { formatRupiah } from "@/lib/format"
import { formToGoal, type GoalForm } from "@/lib/goal-form"
import { goalProgress } from "@/lib/goals"
import type { Goal } from "@/lib/types"
import { UNDO_FOR } from "@/lib/undo"
import { cn } from "@/lib/utils"

/** Which dialog is open. Only one ever is. */
type DialogName = "form" | "history" | "delete" | "reorder"

const ADD_BUTTON_ID = "add-goal-button"
const COMPLETED_TOGGLE_ID = "completed-toggle"

/**
 * Everything under the heading on the Goals page: a line about all the goals
 * together, a card for each, the completed ones folded away at the bottom, and
 * the flows for adding, changing, moving money, reordering and deleting.
 * `nowIso` comes from the server so the server and the browser agree on "today".
 */
export function GoalsView({ nowIso }: { nowIso: string }) {
  const { goals, wallets, addGoal, updateGoal, addToGoal, takeFromGoal, reorderGoals, deleteGoal, undoDelete } = useData()
  const liveDate = useLiveDate(nowIso)
  const today = toDateInput(new Date(liveDate))

  const [open, setOpen] = useState<DialogName>()
  // The goal the open dialog is about. Kept after it closes so its content doesn't vanish mid-fade.
  const [target, setTarget] = useState<Goal>()
  // The goal the form is changing (none when adding). Kept apart so the form doesn't flip to "Add" as it fades.
  const [editing, setEditing] = useState<Goal>()
  // The goal just added, so its card can ease in and be brought into view.
  const [newId, setNewId] = useState<string>()
  // The wallet the last goal was saved in, so the next one starts there.
  const [lastWalletId, setLastWalletId] = useState<string>()
  // Whether the goals already reached are folded open.
  const [showDone, setShowDone] = useState(false)
  // Where keyboard focus goes when a dialog closes: the button that opened it.
  const returnFocus = useReturnFocus()
  // True from pressing Delete until the question closes: the goal's card is going, so focus goes to the Add button.
  const focusAddButton = useRef(false)
  // The goal whose edit is being saved, so focus can follow its card if the edit moves it to the other section.
  const focusGoalAfterClose = useRef<string | undefined>(undefined)

  // On a phone the new card can be far down the page, so scroll to it if it isn't on screen.
  useEffect(() => {
    if (!newId) return
    const card = document.getElementById(`goal-card-${newId}`)
    if (!card) return
    const { top, bottom } = card.getBoundingClientRect()
    if (top >= 0 && bottom <= window.innerHeight) return
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    card.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" })
  }, [newId])

  const walletName = (id: string) => wallets.find((wallet) => wallet.id === id)?.name ?? "an unknown wallet"
  // The owner's own order, with the goals they have reached folded away at the end.
  const inProgress = goals.filter((goal) => !goalProgress(goal).done)
  const reached = goals.filter((goal) => goalProgress(goal).done)

  /** Remembers what opened a dialog, so keyboard focus can go back there. A menu item is about to vanish, so its menu button gets the focus instead. */
  function openDialog(name: DialogName, goal?: Goal) {
    const active = document.activeElement
    if (goal && active instanceof HTMLElement && active.closest('[role="menu"]')) {
      returnFocus.redirect(document.getElementById(goalMenuId(goal.id)))
    } else {
      returnFocus.remember()
    }
    setTarget(goal)
    if (name === "form") setEditing(goal)
    setOpen(name)
  }

  const closeDialog = (isOpen: boolean) => {
    if (!isOpen) setOpen(undefined)
  }

  /**
   * A card that changes between "in progress" and "completed" is a new element in a
   * different list, so whatever had the keyboard focus (a button on the old card) is
   * gone. Send focus to where the goal went: its own menu button when it is showing,
   * otherwise the "Completed" fold it went into. Waits two frames for the move to render.
   */
  function moveFocusTo(goalId: string) {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const target = document.getElementById(goalMenuId(goalId)) ?? document.getElementById(COMPLETED_TOGGLE_ID)
        target?.focus({ preventScroll: true })
      })
    )
  }

  /** Puts focus back on the button that opened the edit form, unless the edit moved the goal's card. */
  function closeFormDialog(event: Event) {
    const moved = focusGoalAfterClose.current
    focusGoalAfterClose.current = undefined
    if (!moved) return returnFocus.restore(event)
    event.preventDefault()
    moveFocusTo(moved)
  }

  async function handleSave(form: GoalForm) {
    try {
      if (editing) {
        const before = goalProgress(editing).done
        const saved = await updateGoal(editing.id, formToGoal(form))
        if (goalProgress(saved).done !== before) focusGoalAfterClose.current = saved.id
        toast.success("Goal updated")
      } else {
        const saved = await addGoal(formToGoal(form))
        setNewId(saved.id)
        toast.success("Goal added", { description: saved.name })
      }
      setLastWalletId(form.walletId)
    } catch (error) {
      toast.error("Couldn't save that", { description: errorMessage(error) })
      throw error // tells the form to stay open
    }
  }

  async function handleMoveMoney(goal: Goal, input: MoveMoneyInput) {
    try {
      const wasDone = goalProgress(goal).done
      if (input.direction === "take-out") {
        const saved = await takeFromGoal(goal.id, input.amount)
        toast.success(`Took out ${formatRupiah(input.amount)}`, {
          description: `${saved.name} now has ${formatRupiah(saved.savedAmount)} of ${formatRupiah(saved.targetAmount)}`,
        })
        // Taking money out of a reached goal can bring it back into the goals still being saved for.
        if (goalProgress(saved).done !== wasDone) moveFocusTo(saved.id)
        return
      }
      const { goal: saved, transaction } = await addToGoal(goal.id, input.amount, input.fromWalletId)
      const moved = transaction ? ` Moved from ${walletName(input.fromWalletId!)}.` : ""
      if (goalProgress(saved).done !== wasDone) moveFocusTo(saved.id)
      if (goalProgress(saved).done) {
        coinShower()
        toast.success("Goal reached", {
          description: `${saved.name} is fully funded. Nicely saved.${moved}`,
          icon: <CelenganArt still className="w-full" />,
          classNames: { icon: "size-10! mr-1" },
        })
      } else {
        toast.success(`Added ${formatRupiah(input.amount)}`, {
          description: `${saved.name} now has ${formatRupiah(saved.savedAmount)} of ${formatRupiah(saved.targetAmount)}.${moved}`,
        })
      }
    } catch (error) {
      toast.error(input.direction === "take-out" ? "Couldn't take that out" : "Couldn't add that", {
        description: errorMessage(error),
      })
      throw error // tells the box to stay open
    }
  }

  async function handleReorder(ids: string[]) {
    try {
      await reorderGoals(ids)
      toast.success("Order saved")
    } catch (error) {
      toast.error("Couldn't save the order", { description: errorMessage(error) })
      throw error // tells the dialog to stay open
    }
  }

  async function handleDelete() {
    if (!target) return
    focusAddButton.current = true
    const gone = target
    try {
      const undoId = await deleteGoal(gone.id)
      toast.success("Goal deleted", {
        description: gone.name,
        // Long enough to notice it and change your mind, and gone after that.
        duration: UNDO_FOR,
        action: { label: "Undo", onClick: () => void undoGoalDelete(undoId) },
      })
      // If the question had already closed, focus was put on a button that the last goal's going has just swapped for the empty state's.
      requestAnimationFrame(() => {
        if (document.activeElement === document.body) document.getElementById(ADD_BUTTON_ID)?.focus()
      })
    } catch (error) {
      focusAddButton.current = false // the card is still there, so focus goes back to it
      toast.error("Couldn't delete that", { description: errorMessage(error) })
    }
  }

  /** The Undo button in the "Goal deleted" message: the goal comes back with its history and its place, and its card eases in. */
  async function undoGoalDelete(undoId: string) {
    try {
      const result = await undoDelete(undoId)
      if (result.kind !== "goal") return
      setNewId(result.goal.id)
      toast.success("Goal restored", { description: result.goal.name })
    } catch (error) {
      toast.error("Couldn't undo that", { description: errorMessage(error) })
    }
  }

  /** After a delete, focus goes to the Add button, looked up now because the last goal's going swaps it for the empty state's. */
  function closeDeleteDialog(event: Event) {
    if (!focusAddButton.current) return returnFocus.restore(event)
    focusAddButton.current = false
    event.preventDefault()
    document.getElementById(ADD_BUTTON_ID)?.focus({ preventScroll: true })
  }

  const cardProps = (goal: Goal) => ({
    goal,
    walletName: walletName(goal.walletId),
    today,
    isNew: goal.id === newId,
    onEdit: (g: Goal) => openDialog("form", g),
    onHistory: (g: Goal) => openDialog("history", g),
    onDelete: (g: Goal) => openDialog("delete", g),
    onMoveMoney: handleMoveMoney,
  })

  return (
    <div className="mt-8 flex flex-col gap-5 md:mt-10">
      {goals.length === 0 ? (
        <EmptyState onAdd={() => openDialog("form")} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <p className="text-sm text-muted-foreground">
              <GoalSummary goals={goals} />
            </p>
            <div className="flex items-center gap-2">
              {goals.length > 1 ? (
                <Button variant="outline" size="lg" onClick={() => openDialog("reorder")} aria-label="Reorder goals" className="max-sm:min-w-10">
                  <ArrowUpDown aria-hidden />
                  <span className="hidden sm:inline">Reorder</span>
                </Button>
              ) : null}
              <Button id={ADD_BUTTON_ID} size="lg" onClick={() => openDialog("form")}>
                <Plus aria-hidden />
                Add goal
              </Button>
            </div>
          </div>

          {inProgress.length > 0 ? (
            <ul className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {inProgress.map((goal) => (
                <GoalCard key={goal.id} {...cardProps(goal)} />
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border bg-card px-6 py-10 text-center text-muted-foreground shadow-sm">
              Every goal is fully funded. Add another when you think of one.
            </p>
          )}

          {reached.length > 0 ? (
            <section aria-labelledby="completed-goals" className="flex flex-col gap-4">
              <h2 id="completed-goals">
                <button
                  type="button"
                  id={COMPLETED_TOGGLE_ID}
                  onClick={() => setShowDone((shown) => !shown)}
                  aria-expanded={showDone}
                  aria-controls="completed-goals-list"
                  className="tap-area -my-1 flex items-center gap-1.5 rounded-md py-1 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
                >
                  <ChevronRight
                    className={cn("size-4 transition-transform duration-200", showDone && "rotate-90")}
                    aria-hidden
                  />
                  Completed
                  <span className="tabular-nums">({reached.length})</span>
                </button>
              </h2>
              {showDone ? (
                <ul id="completed-goals-list" className="grid animate-in grid-cols-1 gap-4 duration-200 fade-in-0 slide-in-from-top-1 xl:grid-cols-2">
                  {reached.map((goal) => (
                    <GoalCard key={goal.id} {...cardProps(goal)} />
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </>
      )}

      <GoalDialog
        open={open === "form"}
        onOpenChange={closeDialog}
        editing={editing}
        defaultWalletId={lastWalletId ?? goals.at(-1)?.walletId ?? wallets[0]?.id ?? ""}
        today={today}
        onSave={handleSave}
        onCloseAutoFocus={closeFormDialog}
      />
      <GoalHistoryDialog
        open={open === "history"}
        onOpenChange={closeDialog}
        goal={target}
        onCloseAutoFocus={returnFocus.restore}
      />
      <GoalReorderDialog
        open={open === "reorder"}
        onOpenChange={closeDialog}
        onSave={handleReorder}
        onCloseAutoFocus={returnFocus.restore}
      />
      <DeleteGoalDialog
        open={open === "delete"}
        onOpenChange={closeDialog}
        goal={target}
        walletName={target ? walletName(target.walletId) : ""}
        onConfirm={handleDelete}
        onCloseAutoFocus={closeDeleteDialog}
      />
    </div>
  )
}

/** Shown when there are no goals at all. */
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-12 text-center shadow-sm">
      <CelenganArt className="w-52" />
      <h2 className="type-title mt-3">What are you saving for?</h2>
      <p className="mt-2 max-w-[42ch] text-muted-foreground">
        A trip, a new laptop, a rainy-day fund. Give it a target and add money as you go.
      </p>
      <div className="mt-6">
        <Button id={ADD_BUTTON_ID} size="lg" onClick={onAdd}>
          <Plus aria-hidden />
          Create your first goal
        </Button>
      </div>
    </div>
  )
}
