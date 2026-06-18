import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, LogIn } from 'lucide-react'
import { handleServerError } from '@/lib/handle-server-error'
import { cn } from '@/lib/utils'
import { fetchCaptcha } from '@/app/auth/api'
import { loginWithPassword } from '@/app/auth/session'
import type { CaptchaPayload } from '@/types/auth'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'

const formSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, '请输入用户名')
    .max(50, '用户名长度不能超过 50 个字符'),
  password: z.string().min(1, '请输入密码').max(100, '密码长度不能超过 100 个字符'),
  captchaCode: z
    .string()
    .trim()
    .min(1, '请输入验证码')
    .max(10, '验证码长度不正确'),
  rememberMe: z.boolean(),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isCaptchaLoading, setIsCaptchaLoading] = useState(true)
  const [captcha, setCaptcha] = useState<CaptchaPayload | null>(null)
  const navigate = useNavigate()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
      captchaCode: '',
      rememberMe: false,
    },
  })

  const refreshCaptcha = async () => {
    setIsCaptchaLoading(true)
    try {
      const nextCaptcha = await fetchCaptcha()
      setCaptcha(nextCaptcha)
      form.setValue('captchaCode', '', {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      })
    } catch (error) {
      setCaptcha(null)
      handleServerError(error)
    } finally {
      setIsCaptchaLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshCaptcha()
    }, 0)

    return () => window.clearTimeout(timer)
    // react-hook-form instance is stable for the component lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const captchaSource = captcha?.image
    ? captcha.image.startsWith('data:image')
      ? captcha.image
      : `data:image/png;base64,${captcha.image}`
    : ''

  async function onSubmit(data: z.infer<typeof formSchema>) {
    if (!captcha?.key) {
      await refreshCaptcha()
      return
    }

    setIsLoading(true)

    try {
      const user = await loginWithPassword({
        username: data.username,
        password: data.password,
        captchaCode: data.captchaCode,
        captchaKey: captcha.key,
        rememberMe: data.rememberMe,
      })

      if (!user) {
        return
      }

      navigate({
        to: redirectTo || '/',
        replace: true,
      })
    } catch (error) {
      handleServerError(error)
      await refreshCaptcha()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='username'
          render={({ field }) => (
            <FormItem>
              <FormLabel>用户名</FormLabel>
              <FormControl>
                <Input placeholder='请输入用户名' autoComplete='username' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>密码</FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder='请输入密码'
                  autoComplete='current-password'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className='grid gap-3 sm:grid-cols-[1fr_132px] sm:items-start'>
          <FormField
            control={form.control}
            name='captchaCode'
            render={({ field }) => (
              <FormItem>
                <FormLabel>验证码</FormLabel>
                <FormControl>
                  <Input
                    placeholder='请输入验证码'
                    inputMode='text'
                    autoComplete='off'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className='space-y-2'>
            <div
              aria-hidden='true'
              className='flex h-4 items-center text-sm font-medium opacity-0 select-none'
            >
              验证码图片
            </div>
            <button
              type='button'
              className='flex h-9 w-full items-center justify-center overflow-hidden rounded-md border border-input bg-muted/30 shadow-xs transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-70'
              onClick={() => void refreshCaptcha()}
              disabled={isLoading || isCaptchaLoading}
              aria-label='点击切换验证码'
              title='点击切换验证码'
            >
              <div className='flex h-full w-full items-center justify-center overflow-hidden'>
                {isCaptchaLoading ? (
                  <Loader2 className='size-4 animate-spin text-muted-foreground' />
                ) : captchaSource ? (
                  <img
                    src={captchaSource}
                    alt='登录验证码'
                    className='h-full w-full object-cover'
                  />
                ) : (
                  <span className='text-xs text-muted-foreground'>验证码加载失败</span>
                )}
              </div>
            </button>
          </div>
        </div>
        <FormField
          control={form.control}
          name='rememberMe'
          render={({ field }) => (
            <FormItem className='flex flex-row items-center gap-2 space-y-0'>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(Boolean(checked))
                  }
                />
              </FormControl>
              <FormLabel className='cursor-pointer font-normal'>
                记住会话
              </FormLabel>
            </FormItem>
          )}
        />
        <Button
          className='mt-2'
          disabled={isLoading || isCaptchaLoading || !captcha?.key}
        >
          {isLoading ? <Loader2 className='animate-spin' /> : <LogIn />}
          登录
        </Button>
      </form>
    </Form>
  )
}
