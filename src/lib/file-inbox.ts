import type { OpenRequest } from './types'

// One native listener per frontend lifetime. A React StrictMode unsubscribe does
// not lose a native request: the inbox buffers it until the next subscriber.
export function createFileInbox(
  connect: (notify: () => void) => Promise<() => void>,
  drain: () => Promise<OpenRequest[]>,
) {
  const subscribers = new Set<(request: OpenRequest) => void>()
  const buffer: OpenRequest[] = []
  let started = false
  let draining = false
  let requested = false

  function flush() {
    while (buffer.length && subscribers.size) {
      const request = buffer.shift()!
      for (const callback of subscribers) callback(request)
    }
  }

  async function notify() {
    requested = true
    if (draining) return
    draining = true
    try {
      do {
        requested = false
        buffer.push(...await drain())
        flush()
      } while (requested)
    } catch (error) {
      buffer.push({ type: 'error', message: `Unable to receive opened files: ${String(error)}` })
      flush()
    } finally {
      draining = false
    }
  }

  return {
    subscribe(callback: (request: OpenRequest) => void) {
      subscribers.add(callback)
      flush()
      if (!started) {
        started = true
        // Listen before draining to close the cold-start readiness race.
        void connect(() => { void notify() }).then(() => notify()).catch(error => {
          started = false
          buffer.push({ type: 'error', message: `Unable to listen for opened files: ${String(error)}` })
          flush()
        })
      } else {
        void notify()
      }
      return () => { subscribers.delete(callback) }
    },
  }
}
