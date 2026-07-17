import type {
  AuthResponse,
  ChatSession,
  DocumentItem,
  Message,
  QueryResponse,
  Source,
} from "./types"

// A lightweight in-browser mock of the NestJS RAG backend so the UI is fully
// demonstrable in preview without a live server. State persists to localStorage.

const DOCS_KEY = "rag.mock.documents"
const SESSIONS_KEY = "rag.mock.sessions"
const SEED_KEY = "rag.mock.seeded"

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(value))
}

interface Chunk {
  documentId: string
  chunkIndex: number
  content: string
}

const SEED_DOCS: DocumentItem[] = [
  {
    id: "doc_security_policy",
    filename: "Information-Security-Policy-2025.pdf",
    originalName: "Information-Security-Policy-2025.pdf",
    mimeType: "application/pdf",
    size: 842_112,
    status: "INDEXED",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    indexedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12 + 90_000).toISOString(),
  },
  {
    id: "doc_employee_handbook",
    filename: "Employee-Handbook.pdf",
    originalName: "Employee-Handbook.pdf",
    mimeType: "application/pdf",
    size: 1_492_233,
    status: "INDEXED",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    indexedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6 + 120_000).toISOString(),
  },
  {
    id: "doc_q4_report",
    filename: "Q4-Financial-Report.pdf",
    originalName: "Q4-Financial-Report.pdf",
    mimeType: "application/pdf",
    size: 2_101_044,
    status: "INDEXING",
    createdAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    indexedAt: null,
  },
]

const SEED_CHUNKS: Chunk[] = [
  {
    documentId: "doc_security_policy",
    chunkIndex: 3,
    content:
      "All employees must enable multi-factor authentication (MFA) on every system that supports it. Passwords must be at least 12 characters and rotated every 90 days. Access to production systems is granted on a least-privilege basis and reviewed quarterly.",
  },
  {
    documentId: "doc_security_policy",
    chunkIndex: 7,
    content:
      "Security incidents must be reported to the Security Operations Center within one hour of discovery. The incident response team follows a five-phase process: identification, containment, eradication, recovery, and post-incident review.",
  },
  {
    documentId: "doc_security_policy",
    chunkIndex: 11,
    content:
      "Customer data classified as Confidential must be encrypted at rest using AES-256 and in transit using TLS 1.2 or higher. Data retention for confidential records is limited to seven years unless a legal hold applies.",
  },
  {
    documentId: "doc_employee_handbook",
    chunkIndex: 2,
    content:
      "Full-time employees accrue 20 days of paid time off per year, increasing to 25 days after five years of service. PTO requests should be submitted at least two weeks in advance through the HR portal.",
  },
  {
    documentId: "doc_employee_handbook",
    chunkIndex: 5,
    content:
      "The company observes a hybrid work model. Employees are expected to be in the office at least two days per week. Remote work arrangements beyond this require manager approval and a signed remote work agreement.",
  },
  {
    documentId: "doc_employee_handbook",
    chunkIndex: 9,
    content:
      "The expense reimbursement policy covers travel, lodging, and client meals. Expenses must be submitted within 30 days with itemized receipts. Any single expense over $500 requires pre-approval from a department head.",
  },
]

function ensureSeed() {
  if (typeof window === "undefined") return
  if (window.localStorage.getItem(SEED_KEY)) return
  write(DOCS_KEY, SEED_DOCS)
  write(SEED_KEY, "1")
}

function getChunksForDocs(docs: DocumentItem[]): Chunk[] {
  const indexedIds = new Set(docs.filter((d) => d.status === "INDEXED").map((d) => d.id))
  const extra = read<Chunk[]>("rag.mock.chunks", [])
  return [...SEED_CHUNKS, ...extra].filter((c) => indexedIds.has(c.documentId))
}

function scoreChunk(query: string, content: string): number {
  const q = query.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []
  if (q.length === 0) return 0
  const text = content.toLowerCase()
  let hits = 0
  for (const term of q) if (text.includes(term)) hits += 1
  return hits / q.length
}

function docTitle(docs: DocumentItem[], id?: string) {
  return docs.find((d) => d.id === id)?.filename ?? "document"
}

export const mock = {
  async register(email: string, password: string, name?: string): Promise<AuthResponse> {
    await delay(500)
    return {
      user: { id: uid("user"), email, name: name ?? email.split("@")[0] },
      token: uid("token"),
    }
  },

  async login(email: string, _password: string): Promise<AuthResponse> {
    await delay(500)
    return {
      user: { id: uid("user"), email, name: email.split("@")[0] },
      token: uid("token"),
    }
  },

  async getDocuments(): Promise<DocumentItem[]> {
    ensureSeed()
    await delay(300)
    const docs = read<DocumentItem[]>(DOCS_KEY, SEED_DOCS)
    // Simulate the indexing job finishing over time.
    let changed = false
    const now = Date.now()
    const updated = docs.map((d) => {
      if (d.status === "INDEXING" && now - new Date(d.createdAt).getTime() > 1000 * 30) {
        changed = true
        return { ...d, status: "INDEXED" as const, indexedAt: new Date().toISOString() }
      }
      return d
    })
    if (changed) write(DOCS_KEY, updated)
    return updated
  },

  async uploadDocuments(files: File[]): Promise<DocumentItem[]> {
    ensureSeed()
    await delay(900)
    const docs = read<DocumentItem[]>(DOCS_KEY, SEED_DOCS)
    const created: DocumentItem[] = files.map((f) => ({
      id: uid("doc"),
      filename: f.name,
      originalName: f.name,
      mimeType: f.type || "application/pdf",
      size: f.size,
      status: "INDEXING",
      createdAt: new Date().toISOString(),
      indexedAt: null,
    }))
    write(DOCS_KEY, [...created, ...docs])
    return created
  },

  async deleteDocument(id: string): Promise<{ message: string }> {
    await delay(300)
    const docs = read<DocumentItem[]>(DOCS_KEY, SEED_DOCS)
    write(
      DOCS_KEY,
      docs.filter((d) => d.id !== id),
    )
    return { message: "Document deleted successfully" }
  },

  async getSessions(): Promise<ChatSession[]> {
    await delay(250)
    return read<ChatSession[]>(SESSIONS_KEY, [])
  },

  async getSession(id: string): Promise<ChatSession | null> {
    await delay(200)
    return read<ChatSession[]>(SESSIONS_KEY, []).find((s) => s.id === id) ?? null
  },

  async createSession(userId: string): Promise<ChatSession> {
    await delay(200)
    const sessions = read<ChatSession[]>(SESSIONS_KEY, [])
    const session: ChatSession = {
      id: uid("sess"),
      userId,
      title: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    }
    write(SESSIONS_KEY, [session, ...sessions])
    return session
  },

  async query(userId: string, query: string, sessionId?: string): Promise<QueryResponse> {
    await delay(1100)
    const docs = read<DocumentItem[]>(DOCS_KEY, SEED_DOCS)
    const chunks = getChunksForDocs(docs)

    const ranked = chunks
      .map((c) => ({ ...c, score: scoreChunk(query, c.content) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .filter((c) => c.score > 0)

    const sources: Source[] = ranked.map((c) => ({
      content: c.content,
      documentId: c.documentId,
      chunkIndex: c.chunkIndex,
      score: Number((0.6 + c.score * 0.39).toFixed(3)),
    }))

    let response: string
    if (ranked.length === 0) {
      response = "No answer found in the provided context."
    } else {
      const top = ranked[0]
      response = `${top.content}\n\n- Documento: ${docTitle(docs, top.documentId)}\n- Página: ${
        top.chunkIndex
      }\n- Chunk: ${top.chunkIndex}`
    }

    // Persist to a session so history works in the mock.
    const sessions = read<ChatSession[]>(SESSIONS_KEY, [])
    let session = sessionId ? sessions.find((s) => s.id === sessionId) : undefined
    if (!session) {
      session = {
        id: uid("sess"),
        userId,
        title: query.slice(0, 50),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
      }
      sessions.unshift(session)
    }
    session.title = session.title || query.slice(0, 50)
    session.updatedAt = new Date().toISOString()
    const userMsg: Message = {
      id: uid("msg"),
      chatSessionId: session.id,
      role: "USER",
      content: query,
      createdAt: new Date().toISOString(),
    }
    const assistantMsg: Message = {
      id: uid("msg"),
      chatSessionId: session.id,
      role: "ASSISTANT",
      content: response,
      sources: { chunks: sources },
      createdAt: new Date().toISOString(),
    }
    session.messages = [...(session.messages ?? []), userMsg, assistantMsg]
    write(SESSIONS_KEY, sessions)

    return { response, sources, sessionId: session.id }
  },
}
