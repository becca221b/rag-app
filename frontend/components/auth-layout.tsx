import { FileText, MessagesSquare, ShieldCheck } from "lucide-react"
import { Logo } from "@/components/logo"

const highlights = [
  {
    icon: MessagesSquare,
    title: "Grounded answers",
    description: "Every response is generated only from your documents — never invented.",
  },
  {
    icon: FileText,
    title: "Source citations",
    description: "See the exact passages, pages, and files behind each answer.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise-grade",
    description: "Private per-user knowledge base with secure, scoped access.",
  },
]

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen">
      {/* Brand / value panel */}
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-card p-12 lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_20%_0%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent)]" />
        <div className="relative">
          <Logo className="text-lg" />
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-balance">
            Turn your documents into a trusted knowledge assistant.
          </h2>
          <p className="mt-4 text-muted-foreground text-pretty">
            Atlas retrieves the most relevant passages from your files and generates precise,
            cited answers your team can rely on.
          </p>

          <ul className="mt-10 flex flex-col gap-6">
            {highlights.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-muted-foreground">
          Retrieval-augmented generation, built for the enterprise.
        </p>
      </section>

      {/* Form panel */}
      <section className="flex w-full flex-col lg:w-1/2">
        <header className="flex items-center p-6 lg:hidden">
          <Logo />
        </header>
        <div className="flex flex-1 items-center justify-center p-6 sm:p-12">{children}</div>
      </section>
    </main>
  )
}
