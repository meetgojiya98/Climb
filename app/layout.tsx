import type { Metadata } from "next"
import { Suspense } from "react"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "@/components/providers"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "Climb — Land better roles, faster",
  description: "AI-powered job application assistant that helps you tailor resumes, craft compelling cover letters, and track your job search.",
}

function RootLoading() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", color: "#64748b" }}>
      Loading...
    </div>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className="font-sans antialiased">
      <head>
        {/* Viewport via meta tag for Next.js 13.5 (no Viewport export in this version) */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <Suspense fallback={<RootLoading />}>
              {children}
            </Suspense>
            <Toaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
