// Short beep via Web Audio API -- no audio asset file needed, keeps the
// app dependency-free per CLAUDE.md.
let sharedContext: AudioContext | null = null

export function playRestDoneSound(): void {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return
  sharedContext ??= new Ctor()
  const ctx = sharedContext
  if (ctx.state === 'suspended') void ctx.resume()

  const now = ctx.currentTime
  ;[0, 0.18].forEach((offset) => {
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0, now + offset)
    gain.gain.linearRampToValueAtTime(0.3, now + offset + 0.01)
    gain.gain.linearRampToValueAtTime(0, now + offset + 0.15)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(now + offset)
    oscillator.stop(now + offset + 0.15)
  })
}
