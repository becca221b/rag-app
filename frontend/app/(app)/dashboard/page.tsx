"use client"

import Link from "next/link"
import useSWR from "swr"
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  MessagesSquare,
  Upload,
  Search,
  ArrowRight,
  TrendingUp,
} from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { Spinner } from "@/components/ui/misc"
import { formatBytes, formatDate } from "@/lib/utils"
import { DocumentStatusBadge } from "@/components/document-status"
import type { ChatSession, DocumentItem } from "@/lib/types"

export default function DashboardPage() {
  const { token, user } = useAuth()

  const { data: documents, isLoading: loadingDocs } = useSWR<DocumentItem[]>(
    token ? ["documents", token] : null,
    () => api.getDocuments(token as string),
    { refreshInterval: 10000 },
  )

  const { data: sessions, isLoading: loadingSessions } = useSWR<ChatSession[]>(
    token ? ["sessions", token] : null,
    () => api.getSessions(token as string),
    { refreshInterval: 15000 },
  )

  const docs = documents ?? []
  const recentSessions = sessions ?? []

  // Stats calculation
  const totalCount = docs.length
  const indexedCount = docs.filter((d) => d.status === "INDEXED").length
  const indexingCount = docs.filter((d) => d.status === "INDEXING" || d.status === "UPLOADED").length
  const errorCount = docs.filter((d) => d.status === "ERROR").length

  const recentDocs = [...docs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)

  const lastSessions = [...recentSessions]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3)

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background scrollbar-thin">
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        {/* Welcome Section */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Welcome back, {user?.name || "User"}!
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitor your document indexing and interact with your knowledge base.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/documents">
              <span className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 cursor-pointer">
                <Upload className="h-4 w-4" />
                Upload Documents
              </span>
            </Link>
            <Link href="/chat">
              <span className="inline-flex items-center gap-2 rounded-xl border border-input bg-card px-4 py-2.5 text-sm font-semibold text-card-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer">
                <Search className="h-4 w-4" />
                Query RAG
              </span>
            </Link>
          </div>
        </header>

        {/* Stats Grid */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card: Total PDFs */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total Documents</span>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500/10 text-blue-500">
                <FileText className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">
                {loadingDocs ? <Spinner className="h-6 w-6 text-muted-foreground" /> : totalCount}
              </span>
              <span className="text-xs text-muted-foreground">uploaded</span>
            </div>
          </div>

          {/* Card: Indexed */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Indexed & Ready</span>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-green-500/10 text-green-500">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-green-500">
                {loadingDocs ? <Spinner className="h-6 w-6 text-muted-foreground" /> : indexedCount}
              </span>
              <span className="text-xs text-muted-foreground">
                {totalCount > 0 ? `${Math.round((indexedCount / totalCount) * 100)}% of total` : "0% of total"}
              </span>
            </div>
          </div>

          {/* Card: Indexing */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Indexing / Pending</span>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-yellow-500/10 text-yellow-500">
                <Loader2 className="h-4 w-4 animate-spin" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-yellow-500">
                {loadingDocs ? <Spinner className="h-6 w-6 text-muted-foreground" /> : indexingCount}
              </span>
              <span className="text-xs text-muted-foreground">in progress</span>
            </div>
          </div>

          {/* Card: Failed */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Errors / Failed</span>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-red-500/10 text-red-500">
                <AlertTriangle className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-red-500">
                {loadingDocs ? <Spinner className="h-6 w-6 text-muted-foreground" /> : errorCount}
              </span>
              <span className="text-xs text-muted-foreground">require attention</span>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Documents */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Recent Documents</h2>
              <Link href="/documents">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer">
                  View all <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </div>

            {loadingDocs ? (
              <div className="flex py-10 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Spinner className="h-4 w-4" /> Loading documents…
              </div>
            ) : recentDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <FileText className="h-8 w-8 mb-2" />
                <p className="text-sm font-medium">No documents yet</p>
                <p className="text-xs mt-0.5">Upload PDFs to get started.</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {recentDocs.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/50 px-4 py-3"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded bg-secondary text-muted-foreground">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{doc.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.size ? `${formatBytes(doc.size)} · ` : ""}
                        {formatDate(doc.createdAt)}
                      </p>
                    </div>
                    <DocumentStatusBadge status={doc.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recent Conversations */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Recent Conversations</h2>
              <Link href="/chat">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer">
                  New query <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </div>

            {loadingSessions ? (
              <div className="flex py-10 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Spinner className="h-4 w-4" /> Loading conversations…
              </div>
            ) : lastSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <MessagesSquare className="h-8 w-8 mb-2" />
                <p className="text-sm font-medium">No conversations yet</p>
                <p className="text-xs mt-0.5">Start querying your documents.</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {lastSessions.map((session) => (
                  <li
                    key={session.id}
                    className="rounded-lg border border-border/50 bg-background/50 transition-colors hover:border-primary/30"
                  >
                    <Link href={`/chat?sessionId=${session.id}`}>
                      <span className="flex items-center gap-3 px-4 py-3 cursor-pointer">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded bg-secondary text-muted-foreground">
                          <MessagesSquare className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {session.title || session.messages?.[0]?.content || "New conversation"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Last updated {formatDate(session.updatedAt)}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform hover:translate-x-0.5" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Quick Tips or Integration block */}
        <section className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-6 text-card-foreground">
          <div className="flex gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-semibold text-primary">Under the Hood: RAG with Bedrock</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                When you query, the system converts your text into dense embeddings using{" "}
                <strong>Amazon Bedrock Titan Embeddings</strong>, performs a vector similarity search on
                your chunks in <strong>Amazon OpenSearch Serverless</strong>, and generates a fully
                cited response using <strong>Claude 3.5 Sonnet</strong>.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
