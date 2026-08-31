// Short beep via Web Audio API -- no audio asset file needed, keeps the
// app dependency-free per CLAUDE.md.
//
// iOS will not let a page make noise until an AudioContext has been resumed
// inside a real user gesture. A rest timer fires on a TIMER, never on a tap,
// so without priming the context on the first interaction of the session the
// beep is silently dropped every single time -- which is exactly what
// happened in the gym. primeAudio() is called from the first tap in a
// workout; playRestDoneSound() then only has to resume a context that is
// already unlocked.
let sharedContext: AudioContext | null = null

function getContext(): AudioContext | null {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  sharedContext ??= new Ctor()
  return sharedContext
}

// Call from inside a user gesture (tap). Unlocks audio for the rest of the
// session; a silent one-sample buffer is the standard way to do it on iOS.
export function primeAudio(): void {
  const ctx = getContext()
  if (!ctx) return
  void ctx.resume()
  try {
    const buffer = ctx.createBuffer(1, 1, 22050)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start(0)
  } catch {
    // Nothing to do -- the beep just stays silent on this device.
  }
}

export function playRestDoneSound(): void {
  const ctx = getContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()

  const now = ctx.currentTime
  // Three beeps, not two -- one short chirp is easy to miss in a loud gym.
  ;[0, 0.18, 0.36].forEach((offset) => {
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0, now + offset)
    gain.gain.linearRampToValueAtTime(0.6, now + offset + 0.01)
    gain.gain.linearRampToValueAtTime(0, now + offset + 0.15)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(now + offset)
    oscillator.stop(now + offset + 0.15)
  })
}

// Vibration as a second channel -- works with the phone on silent, and is
// ignored where unsupported (iOS Safari has no Vibration API, Android does).
export function vibrateRestDone(): void {
  try {
    navigator.vibrate?.([200, 100, 200])
  } catch {
    // ignore
  }
}
