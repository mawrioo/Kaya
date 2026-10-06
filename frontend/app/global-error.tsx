"use client"

import "./globals.css"

/**
 * Shown when the page can't be built at all, which in practice means the
 * backend (the part that holds your data) isn't running.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="type-title">KAYA can&rsquo;t reach your data</h1>
          <p className="text-muted-foreground">
            The part that saves your data, the backend, isn&rsquo;t answering. Start the app from the project folder
            with <code className="rounded bg-muted px-1.5 py-0.5 text-sm">npm run dev</code>, then try again. Nothing
            you saved has been lost.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-2 h-10 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
