import type { Metadata } from "next"
import { Suspense } from "react"
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "@/components/providers"
import { Toaster } from "@/components/ui/sonner"

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
})

const fontDisplay = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Climb OS v3 — AI Career Command Platform",
  description:
    "Version 3 of Climb with a redesigned command-grade UX, advanced visuals, and AI-first workflow orchestration across career operations.",
}

function RootLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-jakarta), sans-serif",
        color: "#6C7D96",
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
