import { CheckCircle2, CircleAlert, Clock, Loader } from "lucide-react"
import { Badge } from "@/components/ui/misc"
import type { DocumentStatus } from "@/lib/types"

const config = {
  UPLOADED: { tone: "neutral" as const, label: "Uploaded", Icon: Clock, spin: false },
  INDEXING: { tone: "warning" as const, label: "Indexing", Icon: Loader, spin: true },
  INDEXED: { tone: "success" as const, label: "Indexed", Icon: CheckCircle2, spin: false },
  ERROR: { tone: "destructive" as const, label: "Failed", Icon: CircleAlert, spin: false },
}

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const { tone, label, Icon, spin } = config[status] ?? config.UPLOADED
  return (
    <Badge tone={tone}>
      <Icon className={spin ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
      {label}
    </Badge>
  )
}
