/**
 * 应用内确认框的宿主：渲染 confirmAction（confirm.ts）发出的确认请求。
 * 文案来自作品（不可信），只当作纯文本显示。
 */
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { errorMessage } from '@/api/errors'
import { useSettings, useUpdateSettings } from '@/api/queries'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import { settleConfirm as settle, useConfirmStore } from './confirm'

/** 挂在根布局中，渲染当前的确认请求。 */
export function ConfirmHost() {
  const { t } = useTranslation()
  const req = useConfirmStore((s) => s.req)
  // 提示偏好跨页面共用，每次请求确认时读取最新值。
  const settings = useSettings({ enabled: !!req?.warning, staleTime: 0 })
  const update = useUpdateSettings()
  const ready = !req?.warning || !settings.isFetching
  const dismissed = !!(req?.warning && settings.data?.dismissed_warnings[req.warning])
  useEffect(() => {
    if (ready && dismissed && req && !req.remember && useConfirmStore.getState().req === req) settle(true)
  }, [ready, dismissed, req])
  const accept = async () => {
    if (!req || update.isPending) return
    if (req.warning && req.remember) {
      try {
        await update.mutateAsync({ dismissed_warnings: { [req.warning]: true } })
      } catch (err) {
        toast.error(errorMessage(err))
        return
      }
    }
    if (useConfirmStore.getState().req === req) settle(true)
  }
  return (
    <AlertDialog
      open={req !== null && ready && (!dismissed || req.remember)}
      onOpenChange={(open) => !open && !update.isPending && settle(false)}
    >
      <AlertDialogContent onEscapeKeyDown={(e) => update.isPending && e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('common.confirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-wrap">{req?.message}</AlertDialogDescription>
        </AlertDialogHeader>
        {req?.warning && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              className="size-4 accent-gold"
              checked={req.remember}
              disabled={update.isPending}
              onChange={(e) => useConfirmStore.setState({ req: { ...req, remember: e.target.checked } })}
            />
            {t('common.dontAskAgain')}
          </label>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={update.isPending} onClick={() => settle(false)}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={update.isPending}
            onClick={(e) => {
              e.preventDefault()
              void accept()
            }}
          >
            {t('common.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
