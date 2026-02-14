import type { Metadata } from "next"
import { Suspense } from "react"
import { Manrope, Sora } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "@/components/providers"
import { Toaster } from "@/components/ui/sonner"

const fontSans = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
})

const fontDisplay = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Climb OS — AI Career Operations Platform",
  description:
    "Enterprise-grade AI workspace for career execution: strategy, role fit, resume ops, interviews, and forecast in one command center.",
}

function RootLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-manrope), sans-serif",
        color: "#637191",
      }}
    >
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontDisplay.variable} font-sans antialiased`}
    >
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
