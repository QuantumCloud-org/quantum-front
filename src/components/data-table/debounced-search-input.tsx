import { useEffect, useEffectEvent, useState, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'

const FILTER_DELAY_MS = 300

export function DebouncedSearchInput({
  committed,
  onCommit,
  ...props
}: Omit<ComponentProps<typeof Input>, 'value' | 'onChange'> & {
  committed: string
  onCommit: (value: string) => void
}) {
  const [draft, setDraft] = useState({ value: committed, committed })
  const [composing, setComposing] = useState(false)

  if (draft.committed !== committed) {
    setDraft({ value: committed, committed })
  }

  const commit = useEffectEvent((value: string) => onCommit(value))
  useEffect(() => {
    if (composing || draft.committed !== committed || draft.value === committed)
      return
    const timer = window.setTimeout(() => commit(draft.value), FILTER_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [committed, composing, draft.committed, draft.value])

  return (
    <Input
      {...props}
      value={draft.committed === committed ? draft.value : committed}
      onChange={(event) => setDraft({ value: event.target.value, committed })}
      onCompositionStart={() => setComposing(true)}
      onCompositionEnd={(event) => {
        setComposing(false)
        setDraft({ value: event.currentTarget.value, committed })
      }}
    />
  )
}
