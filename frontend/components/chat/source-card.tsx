import { FileText } from "lucide-react"
import type { Source } from "@/lib/types"

export function SourceCard({
  source,
  index,
  docName,
}: {
  source: Source
  index: number
  docName: string
}) {
  const score = typeof source.score === "number" ? Math.round(source.score * 100) : null
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-accent text-[10px] font-semibold text-accent-foreground">
            {index + 1}
          </span>
          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-xs font-medium">{docName}</span>
        </div>
        {score !== null && (
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{score}% match</span>
        )}
      </div>

      <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-muted-foreground">
        {source.content}
      </p>

      {(typeof source.chunkIndex === "number" || typeof source.pageNumber === "number") && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground/70">
          {typeof source.pageNumber === "number" ? `Page ${source.pageNumber}` : ""}
          {typeof source.pageNumber === "number" && typeof source.chunkIndex === "number" ? " · " : ""}
          {typeof source.chunkIndex === "number" ? `Chunk #${source.chunkIndex}` : ""}
        </p>
      )}
    </div>
  )
}
