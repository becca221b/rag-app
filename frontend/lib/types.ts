export type DocumentStatus = "UPLOADED" | "INDEXING" | "INDEXED" | "ERROR"
export type MessageRole = "USER" | "ASSISTANT"

export interface User {
  id: string
  email: string
  name?: string | null
}

export interface AuthResponse {
  user: User
  token: string
}

export interface DocumentItem {
  id: string
  filename: string
  originalName?: string
  mimeType?: string
  size?: number
  status: DocumentStatus
  createdAt: string
  indexedAt?: string | null
  error?: string | null
}

export interface Source {
  content: string
  documentId?: string
  chunkIndex?: number
  score?: number
}

export interface Message {
  id: string
  chatSessionId: string
  role: MessageRole
  content: string
  sources?: { chunks?: Source[] } | null
  createdAt: string
}

export interface ChatSession {
  id: string
  userId: string
  title?: string | null
  createdAt: string
  updatedAt: string
  messages?: Message[]
}

export interface QueryResponse {
  response: string
  sources: Source[]
  sessionId: string
}
