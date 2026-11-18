import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { sanitizeRedirect } from '@/lib/sanitize-redirect'
import { SignIn } from '@/features/auth/sign-in'

const searchSchema = z.object({
  redirect: z.string().transform(sanitizeRedirect).catch(undefined).optional(),
})

export const Route = createFileRoute('/(auth)/sign-in')({
  component: SignIn,
  validateSearch: searchSchema,
})
