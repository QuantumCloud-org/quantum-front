import { useEffect } from 'react'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

type ForbiddenErrorProps = {
  autoRedirectToSignIn?: boolean
  message?: string
  redirect?: string
}

export function ForbiddenError({
  autoRedirectToSignIn = false,
  message,
  redirect,
}: ForbiddenErrorProps = {}) {
  const navigate = useNavigate()
  const { history } = useRouter()

  useEffect(() => {
    if (!autoRedirectToSignIn) {
      return
    }

    toast.error(message || '账号已被禁用')

    const timeoutId = window.setTimeout(() => {
      navigate({
        to: '/sign-in',
        search: redirect ? { redirect } : undefined,
        replace: true,
      })
    }, 1500)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [autoRedirectToSignIn, message, navigate, redirect])

  return (
    <div className='h-svh'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        <h1 className='text-[7rem] leading-tight font-bold'>403</h1>
        <span className='font-medium'>
          {autoRedirectToSignIn ? '账号不可用' : '无权限访问'}
        </span>
        <p className='text-center text-muted-foreground'>
          {autoRedirectToSignIn ? (
            <>
              {message || '账号已被禁用'}
              <br />
              正在返回登录页，请联系管理员处理。
            </>
          ) : (
            <>
              您当前没有访问此资源的必要权限。
              <br />
              请联系管理员处理。
            </>
          )}
        </p>
        <div className='mt-6 flex gap-4'>
          <Button variant='outline' onClick={() => history.go(-1)}>
            返回上一页
          </Button>
          <Button
            onClick={() =>
              autoRedirectToSignIn
                ? navigate({
                    to: '/sign-in',
                    search: redirect ? { redirect } : undefined,
                    replace: true,
                  })
                : navigate({ to: '/' })
            }
          >
            {autoRedirectToSignIn ? '立即前往登录' : '返回首页'}
          </Button>
        </div>
      </div>
    </div>
  )
}
