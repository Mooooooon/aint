import { ArrowLeft, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Slider } from 'radix-ui'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { useModels, useProviders } from '@/api/queries'
import type { Save } from '@/api/types'
import { Button } from '@/components/ui/button'
import { modelLabel } from '@/lib/modelLabel'
import { cn } from '@/lib/utils'

import { PlaySettingsPopover } from './PlaySettingsPopover'
import type { PlaySettings } from './usePlaySettings'
import { useReaderContext } from '../ReaderContext'

const LEVELS = ['off', 'low', 'medium', 'high'] as const

export function ModelSettings({ save, settings }: { save: Save; settings: PlaySettings }) {
  const { t } = useTranslation()
  const models = useModels()
  const providers = useProviders()
  const current = models.data?.find((m) => m.id === save.settings.narrator_model)
  const provider = providers.data?.find((p) => p.id === current?.provider_id)
  return (
    <PlaySettingsPopover
      settings={settings}
      panel="model"
      trigger={
        <Button
          variant="ghost"
          size="sm"
          className="min-w-0 shrink justify-start gap-1 px-2 font-normal text-ink-muted"
          aria-label={t('playSettings.model')}
          title={current ? modelLabel(current, providers.data) : save.settings.narrator_model}
        >
          <span className="min-w-0 text-left leading-tight">
            <span className="block truncate">{current?.display_name || current?.name || save.settings.narrator_model}</span>
            <span className="block truncate text-[10px] text-ink-faint">
              {provider?.name || current?.provider_id} · {t('newGame.reasoning')} {t(`reasoning.${save.settings.reasoning}`)}
            </span>
          </span>
          <ChevronDown className="size-3 shrink-0" />
        </Button>
      }
    >
      {settings.panel === 'model' && <ModelControls settings={settings} />}
    </PlaySettingsPopover>
  )
}

function ModelControls({ settings }: { settings: PlaySettings }) {
  const { t } = useTranslation()
  const { reading } = useReaderContext()
  const systemReduce = useReducedMotion()
  const reduce = reading?.reduce_motion === 'on' || (reading?.reduce_motion !== 'off' && systemReduce)
  const models = useModels()
  const providers = useProviders()
  const [selecting, setSelecting] = useState(false)
  const { value, change, disabled } = settings
  const model = models.data?.find((m) => m.id === value.narrator_model)
  const provider = providers.data?.find((p) => p.id === model?.provider_id)
  const noReasoning = model?.caps.reasoning === 'none'
  const level = Math.max(0, LEVELS.indexOf(value.reasoning))
  // 拖动位置连续变化，提交的推理档位取最近一档。
  const [position, setPosition] = useState<number | null>(null)
  const groups = [...new Set(models.data?.map((m) => m.provider_id))]

  const controls = selecting ? (
    <div className="space-y-3">
      <Button type="button" variant="ghost" size="sm" onClick={() => setSelecting(false)} className="-ml-2 text-ink-muted">
        <ArrowLeft className="size-4" />
        {t('playSettings.model')}
      </Button>
      <div className="space-y-4" aria-label={t('newGame.model')}>
        {groups.map((id) => (
          <div key={id} role="group" aria-label={providers.data?.find((p) => p.id === id)?.name || id}>
            <p className="mb-1 px-2 text-xs text-ink-faint">{providers.data?.find((p) => p.id === id)?.name || id}</p>
            {models.data
              ?.filter((m) => m.provider_id === id)
              .map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={m.id === value.narrator_model}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-ring',
                    m.id === value.narrator_model && 'bg-selected',
                  )}
                  onClick={() => {
                    change({ narrator_model: m.id })
                    setPosition(null)
                    setSelecting(false)
                  }}
                >
                  <span className="min-w-0 flex-1 break-words">{m.display_name || m.name}</span>
                  {m.id === value.narrator_model && <Check className="size-4 shrink-0 text-gold" />}
                </button>
              ))}
          </div>
        ))}
      </div>
    </div>
  ) : (
    <div className="space-y-4 py-1">
      <div className="text-center">
        <p className="font-serif text-2xl text-gold-text" aria-live="polite">
          {noReasoning ? t('reasoning.off') : t(`reasoning.${value.reasoning}`)}
        </p>
        <button
          type="button"
          onClick={() => setSelecting(true)}
          aria-label={t('playSettings.selectModel')}
          className="mx-auto mt-1 flex max-w-full items-center justify-center gap-1 rounded-md px-2 py-1 text-sm text-ink-muted hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span className="truncate">{model?.display_name || model?.name || value.narrator_model}</span>
          <ChevronRight className="size-3.5 shrink-0" />
        </button>
        <p className="mt-0.5 truncate text-[11px] text-ink-faint">{provider?.name || model?.provider_id}</p>
      </div>
      <Slider.Root
        min={0}
        max={3}
        step={0.01}
        value={[noReasoning ? 0 : (position ?? level)]}
        disabled={disabled || noReasoning}
        onValueChange={([v]) => {
          setPosition(v)
          change({ reasoning: LEVELS[Math.round(v)] })
        }}
        onKeyDown={(e) => {
          const next =
            e.key === 'Home' || e.key === 'PageDown'
              ? 0
              : e.key === 'End' || e.key === 'PageUp'
                ? 3
                : e.key === 'ArrowRight' || e.key === 'ArrowUp'
                  ? Math.min(3, level + 1)
                  : e.key === 'ArrowLeft' || e.key === 'ArrowDown'
                    ? Math.max(0, level - 1)
                    : undefined
          if (next === undefined || disabled || noReasoning) return
          e.preventDefault()
          setPosition(next)
          change({ reasoning: LEVELS[next] })
        }}
        className="relative flex h-10 w-full touch-none items-center select-none data-disabled:opacity-45"
      >
        <Slider.Track className="relative h-5 grow overflow-hidden rounded-full bg-rule-strong/65">
          <Slider.Range className="absolute h-full rounded-full bg-gold/80" />
          <span aria-hidden className="pointer-events-none absolute inset-x-3 inset-y-0 flex items-center justify-between">
            {LEVELS.map((l) => (
              <span key={l} className="size-1 rounded-full bg-ink/25" />
            ))}
          </span>
        </Slider.Track>
        <Slider.Thumb
          aria-label={t('newGame.reasoning')}
          aria-valuenow={noReasoning ? 0 : level}
          aria-valuetext={t(`reasoning.${noReasoning ? 'off' : value.reasoning}`)}
          className="block size-6 cursor-grab rounded-full border border-rule bg-white shadow-sm outline-none transition-transform duration-150 ease-out hover:scale-110 focus-visible:ring-4 focus-visible:ring-gold/30 active:scale-110 active:cursor-grabbing data-disabled:pointer-events-none motion-reduce:transition-none"
        />
      </Slider.Root>
      {noReasoning && <p className="text-center text-xs text-ink-muted">{t('playSettings.noReasoning')}</p>}
      <p className="text-center text-[11px] leading-5 text-ink-faint">{t('playSettings.autoSaveHint')}</p>
    </div>
  )
  if (reduce) return controls
  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div
        key={selecting ? 'models' : 'reasoning'}
        initial={{ opacity: 0, x: selecting ? 8 : -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.14, ease: 'easeOut' }}
      >
        {controls}
      </motion.div>
    </AnimatePresence>
  )
}
