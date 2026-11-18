import { z } from 'zod'

export const userManagementSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  status: z
    .array(z.union([z.literal('active'), z.literal('inactive')]))
    .optional()
    .catch([])
    .transform((values) => (values?.length ? [values[0]] : undefined)),
  sex: z
    .array(z.union([z.literal('0'), z.literal('1'), z.literal('2')]))
    .optional()
    .catch([])
    .transform((values) => (values?.length ? [values[0]] : undefined)),
  username: z
    .string()
    .optional()
    .catch('')
    .transform((value) => value?.trim() || undefined),
  nickname: z
    .string()
    .optional()
    .catch('')
    .transform((value) => value?.trim() || undefined),
  email: z
    .string()
    .optional()
    .catch('')
    .transform((value) => value?.trim() || undefined),
  phone: z
    .string()
    .optional()
    .catch('')
    .transform((value) => value?.trim() || undefined),
})

export type UserManagementSearchState = z.infer<
  typeof userManagementSearchSchema
>
