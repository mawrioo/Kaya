import { cn } from "@/lib/utils"

interface SegmentedSwitchProps<T extends string> {
  /** Names the group of radio buttons, so it must be different from any other switch on the page. */
  name: string
  /** What the choice is about, for screen readers only. */
  legend: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  className?: string
}

/**
 * A pill with two or three choices, one of them raised in white. It is built from real radio buttons, so the arrow keys
 * move between the choices and a screen reader says "1 of 3". Used for the chart's view and for the Insights views.
 */
export function SegmentedSwitch<T extends string>({ name, legend, options, value, onChange, className }: SegmentedSwitchProps<T>) {
  return (
    <fieldset className={className}>
      <legend className="sr-only">{legend}</legend>
      <div className="inline-grid grid-flow-col gap-1 rounded-full bg-muted p-1">
        {options.map((option) => (
          <label key={option.value} className="relative cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex h-9 items-center justify-center rounded-full px-2.5 text-[0.8125rem] font-medium whitespace-nowrap text-muted-foreground transition-colors duration-150 hover:text-foreground sm:px-4 sm:text-sm",
                "peer-checked:bg-card peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
              )}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
