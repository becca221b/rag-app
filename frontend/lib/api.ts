import { mock } from "./mock-db"
import type {
  AuthResponse,
  ChatSession,
  DocumentItem,
  QueryResponse,
} from "./types"

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? ""
const USE_MOCK = process.env.NODE_ENV === "development" && !API_URL

if (!API_URL && process.env.NODE_ENV !== "development") {
  throw new Error("NEXT_PUBLIC_API_URL is required in production mode")
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = "ApiError"
  }
}

/** True when the frontend is running against the in-browser mock backend. */
export const isMockMode = () => USE_MOCK

function authHeaders(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (typeof data?.message === "string") return data.message
    if (Array.isArray(data?.message)) return data.message.join(", ")
  } catch {
    /* ignore */
  }
  return res.statusText || "Request failed"
}

/**
 * Attempt a real API call; if the backend is unreachable (network error), fall
 * back to the mock so the preview stays demonstrable. Real error responses
 * (4xx/5xx) are surfaced to the caller as ApiError.
 */
async function withFallback<T>(real: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  if (USE_MOCK) return fallback()
  try {
    return await real()
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (process.env.NODE_ENV === "development") {
      console.warn("[v0] Backend unreachable, using mock fallback:", (err as Error)?.message)
      return fallback()
    }
    throw err
  }
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init)
  if (!res.ok) throw new ApiError(await parseError(res), res.status)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  async register(email: string, password: string, name?: string): Promise<AuthResponse> {
    return withFallback(
      () =>
        request<AuthResponse>("/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        }),
      () => mock.register(email, password, name),
    )
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    return withFallback(
      () =>
        request<AuthResponse>("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }),
      () => mock.login(email, password),
    )
  },

  async getDocuments(token: string): Promise<DocumentItem[]> {
    return withFallback(
      () => request<DocumentItem[]>("/documents", { headers: authHeaders(token) }),
      () => mock.getDocuments(),
    )
  },

  async uploadDocuments(token: string, files: File[]): Promise<DocumentItem[]> {
    return withFallback(
      async () => {
        // Backend exposes POST /upload (multiple) and POST /documents/upload (single).
        const form = new FormData()
        for (const file of files) form.append("files", file)
        return request<DocumentItem[]>("/upload", {
          method: "POST",
          headers: authHeaders(token),
          body: form,
        })
      },
      () => mock.uploadDocuments(files),
    )
  },

  async deleteDocument(token: string, id: string): Promise<{ message: string }> {
    return withFallback(
      () =>
        request<{ message: string }>(`/documents/${id}`, {
          method: "DELETE",
          headers: authHeaders(token),
        }),
      () => mock.deleteDocument(id),
    )
  },

  async query(token: string, userId: string, query: string, sessionId?: string): Promise<QueryResponse> {
    return withFallback(
      () =>
        request<QueryResponse>("/chat/query", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders(token) },
          body: JSON.stringify({ query, sessionId }),
        }),
      () => mock.query(userId, query, sessionId),
    )
  },

  async getSessions(token: string): Promise<ChatSession[]> {
    return withFallback(
      () => request<ChatSession[]>("/chat/sessions", { headers: authHeaders(token) }),
      () => mock.getSessions(),
    )
  },

  async getSession(token: string, id: string): Promise<ChatSession | null> {
    return withFallback(
      () => request<ChatSession | null>(`/chat/sessions/${id}`, { headers: authHeaders(token) }),
      () => mock.getSession(id),
    )
  },

  async createSession(token: string, userId: string): Promise<ChatSession> {
    return withFallback(
      () =>
        request<ChatSession>("/chat/sessions", {
          method: "POST",
          headers: authHeaders(token),
        }),
      () => mock.createSession(userId),
    )
  },
}
