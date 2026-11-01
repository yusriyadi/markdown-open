import { describe, expect, it, vi } from 'vitest'
import { createFileInbox } from './file-inbox'
import type { OpenRequest } from './types'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(yes => { resolve = yes })
  return { promise, resolve }
}

const file = (path: string): OpenRequest => ({ type: 'document', path })

describe('native open-file inbox', () => {
  it('listens before draining cold-start files and delivers them once', async () => {
    const connected = vi.fn(async () => () => {})
    const drain = vi.fn(async () => [file('/cold.md')]).mockImplementationOnce(async () => {
      expect(connected).toHaveBeenCalledOnce()
      return [file('/cold.md')]
    }).mockResolvedValue([])
    const inbox = createFileInbox(connected, drain)
    const receive = vi.fn()
    const unsubscribe = inbox.subscribe(receive)
    await vi.waitFor(() => expect(receive).toHaveBeenCalledWith(file('/cold.md')))
    unsubscribe()
    inbox.subscribe(receive)
    await vi.waitFor(() => expect(drain).toHaveBeenCalledTimes(2))
    expect(receive).toHaveBeenCalledOnce()
    expect(connected).toHaveBeenCalledOnce()
  })

  it('buffers requests drained while React has no mounted subscriber', async () => {
    const pending = deferred<OpenRequest[]>()
    const inbox = createFileInbox(async () => () => {}, vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue([]))
    const first = vi.fn()
    const unsubscribe = inbox.subscribe(first)
    await Promise.resolve()
    unsubscribe()
    pending.resolve([file('/while-unmounted.md')])
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(first).not.toHaveBeenCalled()
    const second = vi.fn()
    inbox.subscribe(second)
    expect(second).toHaveBeenCalledExactlyOnceWith(file('/while-unmounted.md'))
  })

  it('drains a warm event that arrives while an earlier drain is in progress', async () => {
    let notify!: () => void
    const pending = deferred<OpenRequest[]>()
    const drain = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValueOnce([file('/warm.md')])
    const inbox = createFileInbox(async callback => { notify = callback; return () => {} }, drain)
    const receive = vi.fn()
    inbox.subscribe(receive)
    await vi.waitFor(() => expect(drain).toHaveBeenCalledOnce())
    notify()
    pending.resolve([file('/cold.md')])
    await vi.waitFor(() => expect(receive.mock.calls).toEqual([[file('/cold.md')], [file('/warm.md')]]))
  })

  it('reports IPC failures instead of silently dropping them', async () => {
    const inbox = createFileInbox(async () => () => {}, async () => { throw new Error('IPC unavailable') })
    const receive = vi.fn()
    inbox.subscribe(receive)
    await vi.waitFor(() => expect(receive).toHaveBeenCalledWith(expect.objectContaining({type:'error'})))
  })
})
