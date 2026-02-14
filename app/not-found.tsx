import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-bold mb-2">404</h1>
      <p className="text-muted-foreground mb-6">This page could not be found.</p>
      <Link href="/" className="btn-saffron">
        Go home
      </Link>
    </div>
  )
}
