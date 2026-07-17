import { AuthForm } from "@/components/auth-form"
import { AuthLayout } from "@/components/auth-layout"

export default function RegisterPage() {
  return (
    <AuthLayout>
      <AuthForm mode="register" />
    </AuthLayout>
  )
}
