import { Label } from "@/components/ui/label"

interface FieldProps {
  label: string
  htmlFor: string
  /** Shown under the control in red when there is a problem. */
  error?: string
  /** A quiet line under the control, for a little help. Hidden while there is an error. */
  hint?: React.ReactNode
  children: React.ReactNode
}

/** A label above a control, with its error message (or a small hint) below. */
export function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  return (
    <div className="grid grid-cols-1 content-start gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-sm text-negative wrap-anywhere">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-muted-foreground wrap-anywhere">{hint}</p>
      ) : null}
    </div>
  )
}
