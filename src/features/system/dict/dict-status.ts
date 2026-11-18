import type { DictStatus } from './model'

export function getStatusBadge(status: DictStatus) {
  return status === 1
    ? {
        label: '正常',
        className:
          'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
      }
    : {
        label: '停用',
        className:
          'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
      }
}
