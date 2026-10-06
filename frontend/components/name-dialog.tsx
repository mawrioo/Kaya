"use client"

import { useState } from "react"

import { useData } from "@/components/data-provider"
import { Field } from "@/components/form-field"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { MAX_USER_NAME_LENGTH, validateUserName } from "@/lib/user-form"

interface NameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Saves the name. Throws if it couldn't be saved, which keeps the box open. */
  onSave: (name: string) => Promise<void>
  /** Called as the dialog closes, to put keyboard focus back where it came from. */
  onCloseAutoFocus?: (event: Event) => void
}

/** A small box with one field for the owner's name, which the greeting on Home uses. */
export function NameDialog({ open, onOpenChange, onSave, onCloseAutoFocus }: NameDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid-cols-1 gap-5 sm:max-w-md" onCloseAutoFocus={onCloseAutoFocus}>
        {/* Mounted only while open, so it starts from the saved name every time. */}
        <NameBody
          onCancel={() => onOpenChange(false)}
          onSave={async (name) => {
            await onSave(name)
            onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

function NameBody({ onCancel, onSave }: { onCancel: () => void; onSave: (name: string) => Promise<void> }) {
  const { user } = useData()
  const [name, setName] = useState(user.name)
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const problem = validateUserName(name)
    setError(problem)
    if (problem) {
      // Send the keyboard back to the box that needs attention.
      requestAnimationFrame(() => document.getElementById("user-name")?.focus())
      return
    }
    setSaving(true)
    try {
      await onSave(name.trim())
    } catch {
      // The page has already explained what went wrong. Stay open so nothing typed is lost.
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-5">
      <DialogHeader>
        <DialogTitle className="type-title">Your name</DialogTitle>
        <DialogDescription>The greeting on Home uses it.</DialogDescription>
      </DialogHeader>

      <Field label="Name" htmlFor="user-name" error={error}>
        <Input
          id="user-name"
          autoFocus
          value={name}
          maxLength={MAX_USER_NAME_LENGTH}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "user-name-error" : undefined}
          onChange={(event) => {
            setName(event.target.value)
            setError(undefined)
          }}
          className="h-10 bg-card dark:bg-card"
        />
      </Field>

      <DialogFooter className="mt-1">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </form>
  )
}
