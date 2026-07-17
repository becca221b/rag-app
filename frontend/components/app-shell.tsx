"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { FileText, LogOut, MessagesSquare } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { cn, initials } from "@/lib/utils"
import { AppSidebar } from "@/components/app-sidebar"
import { Logo } from "@/components/logo"
import { Spinner } from "@/components/ui/misc"

const nav = [
  { href: "/chat", label: "Assistant", icon: MessagesSquare },
  { href: "/documents", label: "Documents", icon: FileText },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading, logout } = useAuth()

  useEffect(() => {
    if (!loading && !user) router.replace("/login")
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden md:flex">
        <AppSidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
          <Logo />
          <div className="flex items-center gap-1">
            {nav.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`)
              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={label}
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-md",
                    active ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </Link>
              )
            })}
            <button
              onClick={logout}
              aria-label="Sign out"
              className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <span className="ml-1 grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials(user.name, user.email)}
            </span>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
