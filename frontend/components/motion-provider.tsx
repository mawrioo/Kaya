"use client"

import { MotionConfig } from "motion/react"

/** Every animation made with the motion library slows to a stop for people who asked their system for less movement. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
