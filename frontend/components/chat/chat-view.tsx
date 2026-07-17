"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import useSWR from "swr"
import { MessagesSquare, Plus, Send } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import type { ChatSession, DocumentItem } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/misc"
import { MessageItem, type ChatMessage } from "@/components/chat/message-item"

const SUGGESTIONS = [
  "What is our password and MFA policy?",
  "How many PTO days do full-time employees get?",
  "How must confidential customer data be encrypted?",
  "What is the remote work policy?",
]

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export function ChatView() {
  const { token, user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: documents } = useSWR<DocumentItem[]>(
    token ? ["documents", token] : null,
    () => api.getDocuments(token as string),
  )

  const { data: sessions, mutate: mutateSessions } = useSWR<ChatSession[]>(
    token ? ["sessions", token] : null,
    () => api.getSessions(token as string),
  )

  const docNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const d of documents ?? []) map.set(d.id, d.filename)
    return map
  }, [documents])

  const resolveDocName = useCallback(
    (id?: string) => (id && docNameById.get(id)) || "Document",
    [docNameById],
  )

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  function resetTextareaHeight() {
    if (textareaRef.current) textareaRef.current.style.height = "auto"
  }

  const send = useCallback(
    async (text: string) => {
      const query = text.trim()
      if (!query || !token || !user || sending) return
      setInput("")
      resetTextareaHeight()
      setSending(true)

      const userMsg: ChatMessage = { id: uid(), role: "USER", content: query }
      const pendingId = uid()
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: pendingId, role: "ASSISTANT", content: "", pending: true },
      ])

      try {
        const res = await api.query(token, user.id, query, sessionId)
        setSessionId(res.sessionId)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId
              ? { id: m.id, role: "ASSISTANT", content: res.response, sources: res.sources }
              : m,
          ),
        )
        mutateSessions()
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId
              ? {
                  id: m.id,
                  role: "ASSISTANT",
                  content: "Sorry, I couldn't complete that request. Please try again.",
                }
              : m,
          ),
        )
      } finally {
        setSending(false)
      }
    },
    [token, user, sessionId, sending, mutateSessions],
  )

  async function loadSession(id: string) {
    if (!token) return
    setSessionId(id)
    setMessages([{ id: uid(), role: "ASSISTANT", content: "", pending: true }])
    const session = await api.getSession(token, id)
    const loaded: ChatMessage[] = (session?.messages ?? []).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      sources: m.sources?.chunks ?? [],
    }))
    setMessages(loaded)
  }

  function newChat() {
    setSessionId(undefined)
    setMessages([])
    setInput("")
    textareaRef.current?.focus()
  }

  const hasConversation = messages.length > 0

  return (
    <div className="flex h-full">
      {/* Conversation thread */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border px-6">
          <div>
            <h1 className="text-base font-semibold tracking-tight">Assistant</h1>
            <p className="text-xs text-muted-foreground">Answers grounded in your documents</p>
          </div>
          <Button variant="outline" size="sm" onClick={newChat}>
            <Plus className="h-4 w-4" />
            New chat
          </Button>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto w-full max-w-3xl px-6 py-6">
            {!hasConversation ? (
              <div className="flex flex-col items-center py-10 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <MessagesSquare className="h-6 w-6" />
                </span>
                <h2 className="mt-4 text-lg font-semibold text-balance">
                  Ask anything about your documents
                </h2>
                <p className="mt-1 max-w-md text-sm text-muted-foreground text-pretty">
                  Atlas retrieves the most relevant passages and answers with citations. Try one of
                  these to get started:
                </p>
                <div className="mt-6 grid w-full max-w-lg gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-lg border border-border bg-card px-4 py-3 text-left text-sm text-card-foreground transition-colors hover:border-primary/50 hover:bg-secondary"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {messages.map((m) => (
                  <MessageItem
                    key={m.id}
                    message={m}
                    userLabel={{ name: user?.name, email: user?.email }}
                    resolveDocName={resolveDocName}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-border px-6 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="mx-auto flex w-full max-w-3xl items-end gap-2"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                e.target.style.height = "auto"
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
              }}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing &&
                  e.keyCode !== 229
                ) {
                  e.preventDefault()
                  send(input)
                }
              }}
              rows={1}
              placeholder="Ask a question about your documents…"
              className="max-h-40 min-h-10 flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm leading-relaxed text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 scrollbar-thin"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || sending}
              aria-label="Send message"
              className="h-11 w-11 rounded-xl"
            >
              {sending ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-muted-foreground">
            Atlas only answers from your uploaded documents and cites its sources.
          </p>
        </div>
      </div>

      {/* History panel */}
      <aside className="hidden w-72 shrink-0 flex-col border-l border-border bg-card lg:flex">
        <div className="flex h-16 items-center border-b border-border px-4">
          <h2 className="text-sm font-semibold">History</h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin p-2">
          {!sessions || sessions.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              Your recent conversations will appear here.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {sessions.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => loadSession(s.id)}
                    className={cn(
                      "w-full truncate rounded-md px-3 py-2 text-left text-sm transition-colors",
                      s.id === sessionId
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    {s.title || s.messages?.[0]?.content || "New conversation"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  )
}
