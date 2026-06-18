import { useEffect } from 'react'
import { useSimStore } from './simStore'

/** Drive frame advancement while `playing` is true, using requestAnimationFrame. */
export function usePlayback() {
  const playing = useSimStore((s) => s.playing)
  const speed = useSimStore((s) => s.speed)
  const result = useSimStore((s) => s.result)

  // Auto-start playback whenever a new simulation result arrives.
  useEffect(() => {
    if (!result) return
    useSimStore.getState().setFrame(0)
    useSimStore.getState().setPlaying(true)
  }, [result])

  useEffect(() => {
    if (!playing || !result) return
    const totalFrames = result.hours.length
    // Play the full run in ~20 s at speed 1.
    const framesPerSec = (totalFrames / 20) * speed

    let raf = 0
    let last = 0
    let pos = useSimStore.getState().frame
    if (pos >= totalFrames - 1) pos = 0

    const tick = (now: number) => {
      if (!last) last = now
      const dt = (now - last) / 1000
      last = now
      pos += framesPerSec * dt
      const store = useSimStore.getState()
      if (pos >= totalFrames - 1) {
        store.setFrame(totalFrames - 1)
        store.setPlaying(false)
        return
      }
      store.setFrame(Math.floor(pos))
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, speed, result])
}
