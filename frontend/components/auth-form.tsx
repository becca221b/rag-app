"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { ApiError, isMockMode } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input, Label } from "@/components/ui/input"
import { Spinner } from "@/components/ui/misc"

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter()
  const { login, register } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isRegister = mode === "register"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (isRegister) await register(email, password, name || undefined)
      else await login(email, password)
      router.push("/chat")
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError("Something went wrong. Please try again.")
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {isRegister ? "Create your workspace" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">
          {isRegister
            ? "Start asking questions across your documents in minutes."
            : "Sign in to continue to your knowledge assistant."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isRegister && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Lovelace"
              autoComplete="name"
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isRegister ? "At least 6 characters" : "••••••••"}
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" size="lg" disabled={submitting} className="mt-1">
          {submitting && <Spinner className="h-4 w-4" />}
          {isRegister ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isRegister ? "Already have an account? " : "New to Atlas? "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="font-medium text-primary hover:underline"
        >
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>

      {isMockMode() && (
        <p className="mt-6 rounded-md border border-border bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground">
          Demo mode — no backend connected. Any email and password will sign you in.
        </p>
      )}
    </div>
  )
}
