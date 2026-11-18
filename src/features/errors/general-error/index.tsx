import { useNavigate, useRouter } from '@tanstack/react-router'
import { retryPageLoad } from '@/lib/preload-recovery'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type GeneralErrorProps = React.HTMLAttributes<HTMLDivElement> & {
  minimal?: boolean
  reset?: () => void
}

export function GeneralError({
  className,
  minimal = false,
  reset,
}: GeneralErrorProps) {
  const navigate = useNavigate()
  const router = useRouter()
  const { history } = router
  return (
    <div
      className={cn(
        minimal ? 'min-h-52 w-full p-4' : 'h-svh w-full',
        className
      )}
    >
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        {!minimal && (
          <h1 className='text-[7rem] leading-tight font-bold'>500</h1>
        )}
        <span className='font-medium'>系统开小差了 {`:')`}</span>
        <p className='text-center text-muted-foreground'>
          给您带来不便，敬请谅解。
          <br />
          请稍后再试。
        </p>
        {reset && (
          <Button variant='outline' onClick={retryPageLoad}>
            重试
          </Button>
        )}
        {!minimal && (
          <div className='mt-6 flex gap-4'>
            <Button variant='outline' onClick={() => history.go(-1)}>
              返回上一页
            </Button>
            <Button
              onClick={() => {
                void navigate({ to: '/' })
              }}
            >
              返回首页
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
