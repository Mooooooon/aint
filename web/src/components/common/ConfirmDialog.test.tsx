import '@/i18n'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { toast } from 'sonner'

import { api } from '@/api/endpoints'
import { qk } from '@/api/queries'
import type { Settings } from '@/api/types'

import { ConfirmHost } from './ConfirmDialog'
import { confirmAction, settleConfirm, useConfirmStore } from './confirm'

vi.mock('@/api/endpoints', () => ({ api: { settings: { get: vi.fn(), patch: vi.fn() } } }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

const initial = { dismissed_warnings: { model_switch: false, high_context_budget: false } } as Settings
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(api.settings.get).mockResolvedValue(initial)
  useConfirmStore.setState({ req: null })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  client.setQueryData(qk.settings, initial)
  render(
    <QueryClientProvider client={client}>
      <ConfirmHost />
    </QueryClientProvider>,
  )
})
afterEach(cleanup)

function ask(warning?: 'model_switch' | 'high_context_budget') {
  let result!: Promise<boolean>
  act(() => {
    result = confirmAction('确认修改设置？', warning)
  })
  return result
}

it('勾选后取消不记录偏好，下一次提示重新等待确认', async () => {
  const first = ask('model_switch')
  await screen.findByRole('checkbox')
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: '取消' }))
  expect(await first).toBe(false)
  expect(api.settings.patch).not.toHaveBeenCalled()
  const second = ask('model_switch')
  await screen.findByRole('checkbox')
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: '取消' }))
  expect(await second).toBe(false)
})

it('确认等待全局偏好写入，之后只跳过对应类别', async () => {
  let finish!: (settings: Settings) => void
  vi.mocked(api.settings.patch).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const first = ask('model_switch')
  await screen.findByRole('checkbox')
  let resolved = false
  void first.then(() => {
    resolved = true
  })
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: '确定' }))
  await waitFor(() => expect((screen.getByRole('button', { name: '取消' }) as HTMLButtonElement).disabled).toBe(true))
  expect(resolved).toBe(false)
  expect(api.settings.patch).toHaveBeenCalledWith({ dismissed_warnings: { model_switch: true } })
  await act(async () => {
    vi.mocked(api.settings.get).mockResolvedValue({ ...initial, dismissed_warnings: { model_switch: true, high_context_budget: false } })
    finish({ ...initial, dismissed_warnings: { model_switch: true, high_context_budget: false } })
    expect(await first).toBe(true)
  })
  const skipped = ask('model_switch')
  expect(await skipped).toBe(true)
  expect(screen.queryByRole('alertdialog')).toBeNull()
  const budget = ask('high_context_budget')
  await screen.findByRole('alertdialog')
  fireEvent.click(screen.getByRole('button', { name: '取消' }))
  expect(await budget).toBe(false)
  const ordinary = ask()
  expect(screen.queryByRole('checkbox')).toBeNull()
  expect(screen.getByRole('alertdialog')).toBeTruthy()
  act(() => settleConfirm(false))
  expect(await ordinary).toBe(false)
})

it('偏好写入失败时保留确认框，不放行设置修改', async () => {
  vi.mocked(api.settings.patch).mockRejectedValue(new Error('设置服务不可用'))
  const result = ask('high_context_budget')
  await screen.findByRole('checkbox')
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: '确定' }))
  await waitFor(() => expect(toast.error).toHaveBeenCalled())
  expect(screen.getByRole('alertdialog')).toBeTruthy()
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true)
  await waitFor(() => expect((screen.getByRole('button', { name: '取消' }) as HTMLButtonElement).disabled).toBe(false))
  fireEvent.click(screen.getByRole('button', { name: '取消' }))
  expect(await result).toBe(false)
})
