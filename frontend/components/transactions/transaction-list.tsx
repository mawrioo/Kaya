"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, MotionConfig, motion } from "motion/react"
import { Pencil, Trash2 } from "lucide-react"

import { TransactionRowContent } from "@/components/transaction-row"
import { SwipeRow } from "@/components/transactions/swipe-row"
import { addDays } from "@/lib/dates"
import { formatDate } from "@/lib/format"
import { describeTransaction } from "@/lib/stats"
import type { DayGroup } from "@/lib/transaction-filters"
import type { Category, Transaction, Wallet } from "@/lib/types"

interface TransactionListProps {
  groups: DayGroup[]
  wallets: Wallet[]
  categories: Category[]
  /** Today's calendar date, "2026-09-30", to label the newest groups "Today" and "Yesterday". */
  today: string
  /** Transactions added since the data last changed. Their rows slide in. */
  freshIds: ReadonlySet<string>
  /** The transaction being deleted. Its row slides out when it goes. */
  leavingId?: string
  onEdit: (tx: Transaction) => void
  onDelete: (tx: Transaction) => void
}

function dayLabel(day: string, today: string): string {
  if (day === today) return `Today, ${formatDate(day)}`
  if (day === addDays(today, -1)) return `Yesterday, ${formatDate(day)}`
  return formatDate(day, { weekday: true })
}

// Quick and gentle: rows ease in and out over about a quarter of a second.
const TIMING = { duration: 0.26, ease: [0.22, 1, 0.36, 1] } as const

const inlineButton =
  "grid size-9 place-items-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-foreground/[0.07]"
const swipeButton = "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium"

/**
 * Every transaction as a row, newest first, under a heading for each day.
 * New rows slide in and deleted ones slide out (but not when a filter merely
 * hides or shows them). On a touch screen a row swipes open to show Edit and Delete.
 */
export function TransactionList({
  groups,
  wallets,
  categories,
  today,
  freshIds,
  leavingId,
  onEdit,
  onDelete,
}: TransactionListProps) {
  const [openId, setOpenId] = useState<string>()

  // A row that was swiped open closes when the owner touches anywhere else.
  useEffect(() => {
    if (!openId) return
    const closeUnlessInside = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest(`[data-swipe-row="${openId}"]`)) {
        setOpenId(undefined)
      }
    }
    document.addEventListener("pointerdown", closeUnlessInside)
    return () => document.removeEventListener("pointerdown", closeUnlessInside)
  }, [openId])

  return (
    <MotionConfig reducedMotion="user">
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <AnimatePresence initial={false}>
          {groups.map((group) => {
            // A day that is entirely new (or entirely going) animates as one piece, so its rows stay still.
            const dayIsNew = group.items.every((tx) => freshIds.has(tx.id))
            const dayIsLeaving = group.items.length === 1 && group.items[0]?.id === leavingId

            return (
              <motion.section
                key={group.day}
                aria-labelledby={`day-${group.day}`}
                initial={dayIsNew ? { height: 0, opacity: 0 } : false}
                animate={{ height: "auto", opacity: 1 }}
                exit={dayIsLeaving ? { height: 0, opacity: 0 } : undefined}
                transition={TIMING}
                className="overflow-hidden border-t first:border-t-0"
              >
                <h2
                  id={`day-${group.day}`}
                  className="border-b bg-muted/60 px-5 py-2.5 text-sm font-medium text-muted-foreground md:px-6"
                >
                  {dayLabel(group.day, today)}
                </h2>
                <ul>
                  <AnimatePresence initial={false}>
                    {group.items.map((tx) => {
                      const { title } = describeTransaction(tx, wallets, categories)
                      const close = () => setOpenId(undefined)

                      return (
                        <motion.li
                          key={tx.id}
                          data-swipe-row={tx.id}
                          initial={freshIds.has(tx.id) && !dayIsNew ? { height: 0, opacity: 0 } : false}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={leavingId === tx.id && !dayIsLeaving ? { height: 0, opacity: 0, x: 24 } : undefined}
                          transition={TIMING}
                          className="overflow-hidden border-t first:border-t-0"
                        >
                          <SwipeRow
                            open={openId === tx.id}
                            onOpenChange={(open) => setOpenId(open ? tx.id : undefined)}
                            actions={
                              <>
                                <button
                                  type="button"
                                  aria-label={`Edit ${title}`}
                                  onClick={() => {
                                    close()
                                    onEdit(tx)
                                  }}
                                  className={`${swipeButton} bg-primary text-primary-foreground`}
                                >
                                  <Pencil className="size-[1.125rem]" aria-hidden />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Delete ${title}`}
                                  onClick={() => {
                                    close()
                                    onDelete(tx)
                                  }}
                                  className={`${swipeButton} bg-negative text-background`}
                                >
                                  <Trash2 className="size-[1.125rem]" aria-hidden />
                                  Delete
                                </button>
                              </>
                            }
                          >
                            <div className="px-5 py-3.5 md:px-6">
                              <TransactionRowContent
                                tx={tx}
                                wallets={wallets}
                                categories={categories}
                                showDate={false}
                                actions={
                                  <>
                                    <button
                                      type="button"
                                      id={`edit-${tx.id}`}
                                      onClick={() => onEdit(tx)}
                                      aria-label={`Edit ${title}`}
                                      className={`${inlineButton} hover:text-foreground`}
                                    >
                                      <Pencil className="size-4" aria-hidden />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onDelete(tx)}
                                      aria-label={`Delete ${title}`}
                                      className={`${inlineButton} hover:text-negative`}
                                    >
                                      <Trash2 className="size-4" aria-hidden />
                                    </button>
                                  </>
                                }
                              />
                            </div>
                          </SwipeRow>
                        </motion.li>
                      )
                    })}
                  </AnimatePresence>
                </ul>
              </motion.section>
            )
          })}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}
