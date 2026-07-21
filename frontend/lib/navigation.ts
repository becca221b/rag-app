import { LayoutDashboard, MessagesSquare, FileText } from "lucide-react"

export interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Assistant", icon: MessagesSquare },
  { href: "/documents", label: "Documents", icon: FileText },
]
