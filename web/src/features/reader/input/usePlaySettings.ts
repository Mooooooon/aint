import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useSettings } from '@/api/queries'
import type { Save, SaveSettings } from '@/api/types'
import { confirmAction } from '@/components/common/confirm'
import { useSaveSettings } from '@/features/save/useSaveSettings'
import { confirmContextBudget } from '@/lib/confirmContextBudget'
import { selectBusy, useReader } from '@/stores/reader'

type Panel = 'model' | 'budget'

/** 两个游玩设置面板共用草稿；离开面板和开始回合等待同一次保存。 */
export function usePlaySettings(save: Save) {
  const { t } = useTranslation()
  const global = useSettings()
  const { update, disabled } = useSaveSettings(save.id)
  const [panel, setPanel] = useState<Panel | null>(null)
  const [patch, setPatch] = useState<Partial<SaveSettings>>({})
  const [saving, setSaving] = useState(false)
  const pending = useRef<Promise<boolean> | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const setForm = useCallback((form: HTMLFormElement | null) => {
    formRef.current = form
  }, [])
  const value = { ...save.settings, ...patch }

  const commit = (): Promise<boolean> => {
    if (pending.current) return pending.current
    if (!panel) return Promise.resolve(true)
    if (formRef.current && !formRef.current.reportValidity()) return Promise.resolve(false)
    const changes = Object.fromEntries(Object.entries(patch).filter(([k, v]) => v !== save.settings[k as keyof SaveSettings]))
    if (Object.keys(changes).length === 0) {
      setPanel(null)
      return Promise.resolve(true)
    }
    if (disabled) return Promise.resolve(false)
    setSaving(true)
    const discard = () => {
      setPatch({})
      setPanel(null)
      return false
    }
    const persist = async () => {
      if (value.narrator_model !== save.settings.narrator_model && !(await confirmAction(t('playSettings.switchWarning'), 'model_switch')))
        return discard()
      const budget = value.context_budget || global.data?.context.budget || 0
      const current = save.settings.context_budget || global.data?.context.budget
      if (!(await confirmContextBudget(budget, current))) return discard()
      if (value.helpers && !save.settings.helpers && !(await confirmAction(t('background.helperCost')))) return discard()
      const reader = useReader.getState()
      if (selectBusy(reader) || reader.compacting) return false
      try {
        await update.mutateAsync(changes)
        setPatch({})
        setPanel(null)
        return true
      } catch {
        // 保存错误由 useSaveSettings 展示，草稿和面板继续保留。
        return false
      }
    }
    pending.current = persist().then((saved) => {
      if (!saved) pending.current = null
      setSaving(false)
      return saved
    })
    return pending.current
  }

  const open = async (next: Panel) => {
    if (panel === next) {
      await commit()
    } else if (!panel || (await commit())) {
      pending.current = null
      setPatch({})
      setPanel(next)
    }
  }

  return {
    panel,
    value,
    saving,
    disabled: disabled || saving,
    setForm,
    commit,
    open,
    change: (changes: Partial<SaveSettings>) => {
      if (disabled || saving) return
      pending.current = null
      setPatch((p) => ({ ...p, ...changes }))
    },
  }
}

export type PlaySettings = ReturnType<typeof usePlaySettings>
