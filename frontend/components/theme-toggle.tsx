"use client"

import { useSyncExternalStore } from "react"
import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun, name: "Light" },
  { value: "dark", label: "Dark", icon: Moon, name: "Dark" },
  { value: "system", label: "Auto", icon: Monitor, name: "Auto, match system setting" },
] as const

const subscribe = () => () => {}

/** Light / dark / auto switch. next-themes persists the choice in localStorage. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  // The stored theme is only known in the browser; show no selection until hydrated.
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )

  return (
    <ToggleGroup
      type="single"
      spacing={0}
      value={hydrated ? (theme ?? "system") : ""}
      onValueChange={(value) => {
        if (value) setTheme(value)
      }}
      aria-label="Appearance"
      className="grid w-full grid-cols-3 rounded-full bg-sidebar-accent p-1"
    >
      {OPTIONS.map(({ value, label, icon: Icon, name }) => (
        <ToggleGroupItem
          key={value}
          value={value}
          aria-label={name}
          className="h-8 w-full gap-1.5 rounded-full! px-2! text-[0.8125rem] font-medium text-sidebar-muted transition-colors duration-150 hover:bg-transparent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[state=on]:bg-sidebar-primary data-[state=on]:text-sidebar-primary-foreground data-[state=on]:shadow-xs data-[state=on]:hover:bg-sidebar-primary data-[state=on]:hover:text-sidebar-primary-foreground"
        >
          <Icon className="size-3.5" aria-hidden />
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
