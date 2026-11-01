import { describe, expect, it, vi } from 'vitest'
import { LatestTask } from './latest-task'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

describe('document request ordering', () => {
  it('keeps the most recently requested file even if an older read finishes later', async () => {
    const task = new LatestTask()
    const slow = deferred<string>()
    const apply = vi.fn()
    const fail = vi.fn()
    const first = task.run(() => slow.promise, apply, fail)
    await task.run(async () => 'new document', apply, fail)
    slow.resolve('old document')
    await first
    expect(apply.mock.calls).toEqual([['new document']])
    expect(fail).not.toHaveBeenCalled()
  })

  it('ignores outdated errors and leaves the current document alone on dialog cancellation', async () => {
    const task = new LatestTask()
    const slow = deferred<string>()
    const apply = vi.fn()
    const fail = vi.fn()
    const first = task.run(() => slow.promise, apply, fail)
    await task.run(async () => null, apply, fail)
    slow.reject(new Error('old failure'))
    await first
    expect(apply).not.toHaveBeenCalled()
    expect(fail).not.toHaveBeenCalled()
    await task.run(async () => { throw new Error('current failure') }, apply, fail)
    expect(fail).toHaveBeenCalledOnce()
  })
})
