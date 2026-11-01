// Share the same request ordering across dialogs, Finder, drop, and sidebar loads.
export class LatestTask {
  private revision = 0

  async run<T>(operation: () => Promise<T | null>, apply: (value: T) => void, fail: (error: unknown) => void) {
    const current = ++this.revision
    try {
      const value = await operation()
      if (current === this.revision && value !== null) apply(value)
    } catch (error) {
      if (current === this.revision) fail(error)
    }
  }
}
