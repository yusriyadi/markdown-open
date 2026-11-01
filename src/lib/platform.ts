import type { DesktopBridge } from './types'

export const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
let bridge: Promise<DesktopBridge> | undefined

export function getDesktop(): Promise<DesktopBridge> {
  if (!isDesktop) return Promise.reject(new Error('Desktop features are unavailable in the browser.'))
  bridge ??= import('./tauri').then(module => module.desktop)
  return bridge
}

export function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) return String(error.message)
  return typeof error === 'string' ? error : 'Something went wrong. Please try again.'
}
