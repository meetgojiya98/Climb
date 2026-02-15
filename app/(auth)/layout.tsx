import {
  AmbientTextureLayer,
} from "@/components/ui/experience-system"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <AmbientTextureLayer mode="marketing" />
      <div className="relative z-[1]">{children}</div>
    </div>
  )
}
