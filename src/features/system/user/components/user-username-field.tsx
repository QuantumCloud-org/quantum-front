import type { Control } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { UserActionForm } from './users-action-dialog-form'

export function UserUsernameField({
  control,
  disabled,
}: {
  control: Control<UserActionForm>
  disabled?: boolean
}) {
  return (
    <FormField
      control={control}
      name='username'
      render={({ field }) => (
        <FormItem>
          <FormLabel className='flex items-center gap-1'>
            <span className='text-destructive'>*</span>
            <span>用户名</span>
          </FormLabel>
          <FormControl>
            <Input
              placeholder='请输入用户名'
              autoComplete='off'
              disabled={disabled}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
