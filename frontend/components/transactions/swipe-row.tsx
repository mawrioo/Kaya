"use client"

import { useEffect, useSyncExternalStore } from "react"
import { motion, useAnimationControls } from "motion/react"

/** Width of the two buttons behind the row: 76px each. */
export const ACTIONS_WIDTH = 152
const SNAP = { type: "spring", stiffness: 520, damping: 42 } as const

function subscribeToPointer(onChange: () => void) {
  const query = window.matchMedia("(pointer: coarse)")
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

/** True on touch screens, where the main way of pointing is a finger. */
function useTouchScreen(): boolean {
  return useSyncExternalStore(
    subscribeToPointer,
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false
  )
}

interface SwipeRowProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The buttons revealed behind the row. Shown on touch screens only. */
  actions: React.ReactNode
  children: React.ReactNode
}

/**
 * A row you can swipe left on a touch screen to reveal buttons behind it.
 * Drag it more than about halfway (or flick it) and it snaps open; let go
 * sooner and it springs back. With a mouse there is nothing to swipe: the
 * row's own small buttons are used instead.
 */
export function SwipeRow({ open, onOpenChange, actions, children }: SwipeRowProps) {
  const touch = useTouchScreen()
  const controls = useAnimationControls()

  useEffect(() => {
    void controls.start({ x: open ? -ACTIONS_WIDTH : 0, transition: SNAP })
  }, [open, controls])

  return (
    <div className="relative">
      {/* The buttons sit in the page for screen readers and keyboards. Tabbing onto one slides the row open
          (only for keyboard focus, so returning focus after a tap doesn't reopen it). */}
      <div
        className="absolute inset-y-0 right-0 hidden pointer-coarse:flex"
        style={{ width: ACTIONS_WIDTH }}
        onFocus={(event) => {
          if (event.target.matches(":focus-visible")) onOpenChange(true)
        }}
      >
        {actions}
      </div>
      <motion.div
        className="relative bg-card"
        animate={controls}
        drag={touch ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: -ACTIONS_WIDTH, right: 0 }}
        dragElastic={{ left: 0.12, right: 0 }}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          const startedAt = open ? -ACTIONS_WIDTH : 0
          const endedAt = startedAt + info.offset.x
          const shouldOpen =
            info.velocity.x < -600 ? true : info.velocity.x > 600 ? false : endedAt < -ACTIONS_WIDTH * 0.45
          if (shouldOpen === open) {
            void controls.start({ x: shouldOpen ? -ACTIONS_WIDTH : 0, transition: SNAP })
          } else {
            onOpenChange(shouldOpen)
          }
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}
