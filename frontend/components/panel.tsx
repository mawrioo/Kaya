import { cn } from "@/lib/utils"

interface PanelProps {
  title: string
  /** A quiet line under the title, e.g. the month being shown. */
  caption?: React.ReactNode
  /** Something small on the right of the header, like a "See all" link. */
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}

/** A white card with a serif title. The one container used for every Home section. */
export function Panel({ title, caption, action, className, children }: PanelProps) {
  const headingId = `panel-${title.toLowerCase().replace(/\W+/g, "-")}`

  return (
    <section
      aria-labelledby={headingId}
      className={cn("flex flex-col rounded-xl border bg-card p-5 shadow-sm md:p-6", className)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id={headingId} className="type-title">
            {title}
          </h2>
          {caption ? <p className="mt-1 text-sm text-muted-foreground">{caption}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-5 flex-1">{children}</div>
    </section>
  )
}
