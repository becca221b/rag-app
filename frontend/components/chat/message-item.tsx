"use client"

import { useState } from "react"
import { ChevronDown, Sparkles } from "lucide-react"
import { cn, initials } from "@/lib/utils"
import type { Source } from "@/lib/types"
import { Spinner } from "@/components/ui/misc"
import { SourceCard } from "@/components/chat/source-card"

export interface ChatMessage {
  id: string
  role: "USER" | "ASSISTANT"
  content: string
  sources?: Source[]
  pending?: boolean
}

export function MessageItem({
  message,
  userLabel,
  resolveDocName,
}: {
  message: ChatMessage
  userLabel: { name?: string | null; email?: string | null }
  resolveDocName: (id?: string) => string
}) {
  const [open, setOpen] = useState(false)
  const isUser = message.role === "USER"
  const sources = message.sources ?? []

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold",
          isUser
            ? "bg-secondary text-secondary-foreground"
            : "bg-primary text-primary-foreground",
        )}
        aria-hidden="true"
      >
        {isUser ? initials(userLabel.name, userLabel.email) : <Sparkles className="h-4 w-4" />}
      </span>

      <div className={cn("flex max-w-[85%] flex-col gap-2", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "rounded-tr-sm bg-primary text-primary-foreground"
              : "rounded-tl-sm border border-border bg-card text-card-foreground",
          )}
        >
          {message.pending ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Spinner className="h-3.5 w-3.5" /> Searching your documents…
            </span>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {!isUser && sources.length > 0 && (
          <div className="w-full">
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-expanded={open}
            >
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
              {sources.length} {sources.length === 1 ? "source" : "sources"}
            </button>

            {open && (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {sources.map((source, i) => (
                  <SourceCard
                    key={i}
                    source={source}
                    index={i}
                    docName={resolveDocName(source.documentId)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
