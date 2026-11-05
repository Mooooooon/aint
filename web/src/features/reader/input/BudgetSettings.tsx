import { SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useSettings } from '@/api/queries'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { AdvancedPlaySettings } from '@/features/save/AdvancedPlaySettings'

import { PlaySettingsPopover } from './PlaySettingsPopover'
import type { PlaySettings } from './usePlaySettings'

export function BudgetSettings({ settings }: { settings: PlaySettings }) {
  const { t } = useTranslation()
  const global = useSettings()
  return (
    <PlaySettingsPopover
      settings={settings}
      panel="budget"
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          aria-label={t('playSettings.advanced')}
          title={t('playSettings.advanced')}
        >
          <SlidersHorizontal />
        </Button>
      }
    >
      <div>
        <h3 className="font-serif text-base">{t('playSettings.advanced')}</h3>
        <p className="mt-1 text-xs leading-5 text-ink-muted">{t('playSettings.autoSaveHint')}</p>
      </div>
      <AdvancedPlaySettings expanded value={settings.value} onChange={settings.change} />
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>{t('background.helpers')}</span>
        <Switch
          checked={settings.value.helpers}
          disabled={settings.disabled || !global.data?.models.light}
          onCheckedChange={(helpers) => settings.change({ helpers })}
        />
      </label>
    </PlaySettingsPopover>
  )
}
