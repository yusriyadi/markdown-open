import type { NativeBridge } from './types'

export const isNative = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
export const isAndroid = isNative && (import.meta.env.TAURI_ENV_PLATFORM === 'android' || /Android/i.test(navigator.userAgent))
export const isDesktop = isNative && !isAndroid
let bridge: Promise<NativeBridge> | undefined

export function getNative(): Promise<NativeBridge> {
  if (!isNative) return Promise.reject(new Error('Native features are unavailable in the browser.'))
  bridge ??= (isAndroid ? import('./android') : import('./tauri')).then(module => module.native)
  return bridge
}

export function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) return String(error.message)
  return typeof error === 'string' ? error : 'Something went wrong. Please try again.'
}
