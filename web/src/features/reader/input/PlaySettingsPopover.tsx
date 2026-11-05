import type { ReactElement, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useConfirmStore } from '@/components/common/confirm'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

import type { PlaySettings } from './usePlaySettings'

export function PlaySettingsPopover({
  settings,
  panel,
  trigger,
  children,
}: {
  settings: PlaySettings
  panel: 'model' | 'budget'
  trigger: ReactElement
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <Popover
      open={settings.panel === panel}
      onOpenChange={(open) => {
        if (open) void settings.open(panel)
        else if (settings.panel === panel && !useConfirmStore.getState().req) void settings.commit()
      }}
    >
      <PopoverTrigger asChild data-play-settings-trigger>
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        aria-label={t(panel === 'model' ? 'playSettings.model' : 'playSettings.advanced')}
        align={panel === 'model' ? 'start' : 'end'}
        side="top"
        className="max-h-[70dvh] w-80 max-w-[calc(100vw-1rem)] overflow-y-auto border border-rule bg-paper-overlay text-ink"
        onFocusOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          e.preventDefault()
          if (
            settings.panel !== panel ||
            useConfirmStore.getState().req ||
            (e.target as HTMLElement).closest('[data-play-settings-send], [data-play-settings-trigger]')
          )
            return
          void settings.commit()
        }}
        onEscapeKeyDown={(e) => {
          e.preventDefault()
          if (settings.panel === panel && !useConfirmStore.getState().req) void settings.commit()
        }}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {settings.panel === panel && (
          <form
            ref={(el) => settings.setForm(el)}
            onSubmit={(e) => {
              e.preventDefault()
              void settings.commit()
            }}
            aria-busy={settings.saving}
          >
            <fieldset disabled={settings.disabled} className="min-w-0 space-y-5">
              {children}
            </fieldset>
            {settings.saving && (
              <p role="status" className="mt-3 text-center text-xs text-ink-faint">
                {t('playSettings.saving')}
              </p>
            )}
          </form>
        )}
      </PopoverContent>
    </Popover>
  )
}
