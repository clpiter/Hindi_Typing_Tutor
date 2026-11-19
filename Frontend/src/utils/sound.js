/**
 * Success sound: plays /sounds/success.mp3; if the file cannot be played
 * (autoplay policy, missing codec, old browser) it falls back to a short chime
 * generated with the Web Audio API.
 */
let audio = null
let ctx = null

function webAudioChime() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return false
  ctx = ctx || new AC()
  const now = ctx.currentTime
  ;[1046.5, 1318.5, 1568, 2093].forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const t = now + i * 0.08
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.55)
  })
  return true
}

export async function playSuccessSound() {
  try {
    if (!audio) {
      audio = new Audio('/sounds/success.mp3')
      audio.volume = 0.6
    }
    audio.currentTime = 0
    await audio.play()
    return 'mp3'
  } catch {
    try {
      return webAudioChime() ? 'webaudio' : 'none'
    } catch {
      return 'none'
    }
  }
}
