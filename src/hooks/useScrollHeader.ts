import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { UIEvent } from 'react'
import type { DocumentData } from '../lib/types'

const SCROLL_THRESHOLD = 20
const TOP_EDGE = 8

export function useScrollHeader(document: DocumentData | null) {
  const scrollRef = useRef<HTMLElement>(null)
  const [hidden, setHidden] = useState(false)
  const position = useRef({ top: 0, distance: 0, height: 0, contentHeight: 0 })

  useLayoutEffect(() => {
    setHidden(false)
    const element = scrollRef.current
    if (element) element.scrollTop = 0
    position.current = {
      top: 0,
      distance: 0,
      height: element?.clientHeight ?? 0,
      contentHeight: element?.scrollHeight ?? 0,
    }
  }, [document])

  const onScroll = useCallback((event: UIEvent<HTMLElement>) => {
    // Diagram and sidebar scrolling must not change the page header.
    if (event.target !== event.currentTarget) return
    const element = event.currentTarget
    const previous = position.current
    const top = Math.max(0, Math.min(element.scrollTop, element.scrollHeight - element.clientHeight))
    const delta = top - previous.top
    const resized = previous.height !== element.clientHeight || previous.contentHeight !== element.scrollHeight
    position.current = { top, distance: 0, height: element.clientHeight, contentHeight: element.scrollHeight }

    if (top <= TOP_EDGE) {
      setHidden(false)
      return
    }
    // Header transitions and Mermaid rendering can resize the viewport/content.
    // Their scroll-position adjustments are not user scroll direction changes.
    if (resized) return
    const distance = Math.sign(delta) === Math.sign(previous.distance) ? previous.distance + delta : delta
    position.current.distance = distance
    if (Math.abs(distance) >= SCROLL_THRESHOLD) {
      setHidden(distance > 0)
      position.current.distance = 0
    }
  }, [])

  const showHeader = useCallback(() => setHidden(false), [])
  return { hidden, scrollRef, onScroll, showHeader }
}
