"use client"

import { useCallback, useRef, useState } from "react"
import useSWR from "swr"
import { FileText, Trash2, Upload } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { cn, formatBytes, formatDate } from "@/lib/utils"
import type { DocumentItem } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/misc"
import { DocumentStatusBadge } from "@/components/document-status"

export function DocumentsView() {
  const { token } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data, isLoading, mutate } = useSWR<DocumentItem[]>(
    token ? ["documents", token] : null,
    () => api.getDocuments(token as string),
    { refreshInterval: 6000, revalidateOnFocus: true },
  )

  const documents = data ?? []
  const indexedCount = documents.filter((d) => d.status === "INDEXED").length

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!token || !fileList || fileList.length === 0) return
      const files = Array.from(fileList).filter(
        (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
      )
      if (files.length === 0) {
        setError("Only PDF files are supported.")
        return
      }
      setError(null)
      setUploading(true)
      try {
        const created = await api.uploadDocuments(token, files)
        await mutate((prev) => [...created, ...(prev ?? [])], { revalidate: true })
      } catch {
        setError("Upload failed. Please try again.")
      } finally {
        setUploading(false)
      }
    },
    [token, mutate],
  )

  async function handleDelete(id: string) {
    if (!token) return
    setDeletingId(id)
    try {
      await mutate(
        async () => {
          await api.deleteDocument(token, id)
          return (data ?? []).filter((d) => d.id !== id)
        },
        { optimisticData: documents.filter((d) => d.id !== id), rollbackOnError: true },
      )
    } catch {
      setError("Could not delete the document.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto scrollbar-thin">
      <div className="mx-auto w-full max-w-4xl px-6 py-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {documents.length} {documents.length === 1 ? "document" : "documents"} ·{" "}
              {indexedCount} indexed and ready to query
            </p>
          </div>
          <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
            Upload PDFs
          </Button>
        </header>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ""
          }}
        />

        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            handleFiles(e.dataTransfer.files)
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
            dragging
              ? "border-primary bg-accent/50"
              : "border-border bg-card hover:border-primary/50 hover:bg-secondary/50",
          )}
        >
          <span className="grid h-11 w-11 place-items-center rounded-full bg-accent text-accent-foreground">
            <Upload className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium">Drag & drop PDF files here</p>
          <p className="text-xs text-muted-foreground">or click to browse — up to 10 files at a time</p>
        </div>

        {error && (
          <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {/* List */}
        <div className="mt-8">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4" /> Loading documents…
            </div>
          ) : documents.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-16 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No documents yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload a PDF to build your knowledge base.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center gap-4 px-4 py-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{doc.filename}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {doc.size ? `${formatBytes(doc.size)} · ` : ""}
                      Added {formatDate(doc.createdAt)}
                    </p>
                  </div>
                  <DocumentStatusBadge status={doc.status} />
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    aria-label={`Delete ${doc.filename}`}
                    className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  >
                    {deletingId === doc.id ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
