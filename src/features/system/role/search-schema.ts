import { z } from 'zod'

export const roleManagementSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  roleName: z
    .string()
    .optional()
    .catch('')
    .transform((value) => value?.trim() || undefined),
  roleKey: z
    .string()
    .optional()
    .catch('')
    .transform((value) => value?.trim() || undefined),
  status: z
    .array(z.union([z.literal('active'), z.literal('inactive')]))
    .optional()
    .catch([])
    .transform((values) => (values?.length ? [values[0]] : undefined)),
})

export type RoleManagementSearchState = z.infer<
  typeof roleManagementSearchSchema
>
