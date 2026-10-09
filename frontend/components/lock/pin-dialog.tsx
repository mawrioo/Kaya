"use client"

import { useState } from "react"
import { ChevronRight, KeyRound, Lock, LockOpen } from "lucide-react"
import { toast } from "sonner"

import { useData } from "@/components/data-provider"
import { Field } from "@/components/form-field"
import { PinField } from "@/components/lock/pin-field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { errorMessage } from "@/lib/api"
import { MAX_PIN_LENGTH, MIN_PIN_LENGTH, validatePinForm, type PinErrors } from "@/lib/lock"

type View = "menu" | "set" | "change" | "remove"

interface PinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called as the dialog closes, to put keyboard focus back where it came from. */
  onCloseAutoFocus?: (event: Event) => void
}

/**
 * Everything about the PIN in one box. With no PIN it is the form for choosing one. With a PIN it first shows what can be
 * done (lock now, change it, turn it off) and then the form for the one picked. The forms ask for the current PIN where it
 * matters, and say plainly when it was wrong.
 */
export function PinDialog({ open, onOpenChange, onCloseAutoFocus }: PinDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid-cols-1 gap-5 sm:max-w-md" onCloseAutoFocus={onCloseAutoFocus}>
        {/* Mounted only while open, so it always starts from the right view with empty boxes. */}
        <PinBody onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function PinBody({ onClose }: { onClose: () => void }) {
  const { pinSet, lockNow } = useData()
  const [view, setView] = useState<View>(pinSet ? "menu" : "set")

  if (view === "menu") {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="type-title">PIN lock is on</DialogTitle>
          <DialogDescription>Kaya asks for your PIN before it opens, here and on your phone.</DialogDescription>
        </DialogHeader>
        <ul className="grid grid-cols-1 gap-2">
          <MenuRow
            icon={Lock}
            title="Lock now"
            hint="Ask for the PIN again on this device"
            onClick={() => {
              onClose()
              void lockNow()
            }}
          />
          <MenuRow icon={KeyRound} title="Change PIN" hint="Choose a new one" onClick={() => setView("change")} />
          <MenuRow icon={LockOpen} title="Turn off PIN lock" hint="Kaya opens without asking" onClick={() => setView("remove")} />
        </ul>
        <DialogFooter>
          <Button type="button" variant="ghost" size="lg" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </>
    )
  }

  return <PinForm view={view} onBack={pinSet ? () => setView("menu") : undefined} onDone={onClose} />
}

function MenuRow({ icon: Icon, title, hint, onClick }: { icon: typeof Lock; title: string; hint: string; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="group flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors duration-150 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-sage text-sage-foreground">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.9375rem] leading-snug font-medium">{title}</span>
          <span className="block text-sm leading-snug text-muted-foreground">{hint}</span>
        </span>
        <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
      </button>
    </li>
  )
}

const TITLES: Record<Exclude<View, "menu">, { title: string; description: string; submit: string; busy: string }> = {
  set: {
    title: "Set a PIN",
    description: `Kaya will ask for it before it opens, on this computer and on your phone. Use ${MIN_PIN_LENGTH} to ${MAX_PIN_LENGTH} digits.`,
    submit: "Turn on PIN lock",
    busy: "Turning on…",
  },
  change: {
    title: "Change PIN",
    description: "Your phone and any other device will have to type the new PIN. This one stays open.",
    submit: "Change PIN",
    busy: "Changing…",
  },
  remove: {
    title: "Turn off PIN lock",
    description: "Kaya will open without asking for a PIN, here and on your phone.",
    submit: "Turn off PIN lock",
    busy: "Turning off…",
  },
}

function PinForm({ view, onBack, onDone }: { view: Exclude<View, "menu">; onBack?: () => void; onDone: () => void }) {
  const { setPin, removePin } = useData()
  const [currentPin, setCurrentPin] = useState("")
  const [pin, setNewPin] = useState("")
  const [repeat, setRepeat] = useState("")
  const [errors, setErrors] = useState<PinErrors>({})
  const [saving, setSaving] = useState(false)
  const text = TITLES[view]
  const asksForCurrent = view !== "set"
  const choosesNew = view !== "remove"

  function clear(field: keyof PinErrors) {
    setErrors((current) => (field in current ? { ...current, [field]: undefined } : current))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (saving) return
    const found = view === "remove"
      ? currentPin ? {} : ({ currentPin: "Enter your PIN." } satisfies PinErrors)
      : validatePinForm({ currentPin, pin, repeat }, asksForCurrent)
    setErrors(found)
    const first = (["currentPin", "pin", "repeat"] as const).find((field) => found[field])
    if (first) {
      const id = { currentPin: "pin-current", pin: "pin-new", repeat: "pin-repeat" }[first]
      requestAnimationFrame(() => document.getElementById(id)?.focus())
      return
    }

    setSaving(true)
    try {
      if (view === "remove") {
        await removePin(currentPin)
        toast.success("PIN lock is off", { description: "Kaya opens without asking for a PIN." })
      } else {
        await setPin(pin, asksForCurrent ? currentPin : undefined)
        toast.success(view === "set" ? "PIN lock is on" : "PIN changed", {
          description: view === "set" ? "Kaya will ask for it before it opens." : "Other devices will have to type the new one.",
        })
      }
      onDone()
    } catch (error) {
      // A wrong current PIN is told under its own box; anything else under the last box, so the problem is next to where it can be fixed.
      const message = errorMessage(error)
      const wrongCurrent = asksForCurrent && /PIN isn't right|Too many tries/.test(message)
      setErrors(wrongCurrent ? { currentPin: message } : { [choosesNew ? "repeat" : "currentPin"]: message })
      if (wrongCurrent) setCurrentPin("")
      requestAnimationFrame(() => document.getElementById(wrongCurrent || !choosesNew ? "pin-current" : "pin-repeat")?.focus())
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-5">
      <DialogHeader>
        <DialogTitle className="type-title">{text.title}</DialogTitle>
        <DialogDescription>{text.description}</DialogDescription>
      </DialogHeader>

      {asksForCurrent ? (
        <Field label={view === "remove" ? "Your PIN" : "Current PIN"} htmlFor="pin-current" error={errors.currentPin}>
          <PinField
            id="pin-current"
            value={currentPin}
            onChange={(digits) => {
              setCurrentPin(digits)
              clear("currentPin")
            }}
            invalid={!!errors.currentPin}
            describedBy={errors.currentPin ? "pin-current-error" : undefined}
            autoFocus
            disabled={saving}
          />
        </Field>
      ) : null}

      {choosesNew ? (
        <>
          <Field label="New PIN" htmlFor="pin-new" error={errors.pin} hint={`${MIN_PIN_LENGTH} to ${MAX_PIN_LENGTH} digits.`}>
            <PinField
              id="pin-new"
              value={pin}
              onChange={(digits) => {
                setNewPin(digits)
                clear("pin")
              }}
              invalid={!!errors.pin}
              describedBy={errors.pin ? "pin-new-error" : undefined}
              autoFocus={!asksForCurrent}
              disabled={saving}
            />
          </Field>
          <Field label="Type it again" htmlFor="pin-repeat" error={errors.repeat}>
            <PinField
              id="pin-repeat"
              value={repeat}
              onChange={(digits) => {
                setRepeat(digits)
                clear("repeat")
              }}
              invalid={!!errors.repeat}
              describedBy={errors.repeat ? "pin-repeat-error" : undefined}
              disabled={saving}
            />
          </Field>
        </>
      ) : null}

      <DialogFooter className="mt-1">
        <Button type="button" variant="ghost" size="lg" onClick={onBack ?? onDone}>
          {onBack ? "Back" : "Cancel"}
        </Button>
        <Button type="submit" size="lg" variant={view === "remove" ? "destructive" : "default"} disabled={saving}>
          {saving ? text.busy : text.submit}
        </Button>
      </DialogFooter>
    </form>
  )
}
