import type { Metadata } from "next"
import { Suspense } from "react"
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "@/components/providers"
import { Toaster } from "@/components/ui/sonner"
import {
  AmbientTextureLayer,
  CinematicRouteTransition,
  SurfaceThemeOrchestrator,
} from "@/components/ui/experience-system"

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
  title: "Climb OS - AI Career Operating Intelligence",
  description:
    "Climb delivers an enterprise-grade AI career operating experience with advanced visuals, guided workflows, and mobile-first execution across every surface.",
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
        color: "#5F708D",
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
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover"
        />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <SurfaceThemeOrchestrator />
            <AmbientTextureLayer mode="auto" />
            <CinematicRouteTransition>
              <Suspense fallback={<RootLoading />}>{children}</Suspense>
            </CinematicRouteTransition>
            <Toaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
