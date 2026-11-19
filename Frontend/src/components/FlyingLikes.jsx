import { useEffect, useState } from 'react'
import { FaThumbsUp, FaHeart, FaStar } from 'react-icons/fa'

const KINDS = ['thumb', 'heart', 'thumb', 'heart', 'star', 'sparkle', 'sparkle']
let seq = 0

function makeBurst(origin) {
  const items = []
  for (let i = 0; i < 18; i++) {
    const kind = KINDS[i % KINDS.length]
    items.push({
      id: `${++seq}`,
      kind,
      left: origin + (Math.random() - 0.5) * 140,
      dx: `${(Math.random() - 0.5) * 220}px`,
      dy: `${-(260 + Math.random() * 320)}px`,
      rot: `${(Math.random() - 0.5) * 70}deg`,
      delay: Math.random() * 0.35,
      duration: 1.4 + Math.random() * 0.8,
      size: kind === 'sparkle' ? undefined : 1.3 + Math.random() * 1.1,
    })
  }
  return items
}

/**
 * Flying thumbs-up, hearts, stars and sparkles. Each change of `trigger`
 * (a counter that only the "perfect line" event increments) launches one burst.
 */
export default function FlyingLikes({ trigger }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!trigger) return undefined
    const origin = typeof window !== 'undefined' ? window.innerWidth / 2 : 400
    const burst = makeBurst(origin)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- spawning a burst is a reaction to the trigger prop
    setItems((prev) => [...prev, ...burst])
    const ids = new Set(burst.map((b) => b.id))
    const t = setTimeout(() => setItems((prev) => prev.filter((p) => !ids.has(p.id))), 2600)
    return () => clearTimeout(t)
  }, [trigger])

  if (!items.length) return null
  return (
    <div className="flying-likes" aria-hidden="true" data-testid="flying-likes">
      {items.map((it) => (
        <span
          key={it.id}
          className={`flying-like like-${it.kind}`}
          style={{
            left: it.left,
            fontSize: it.size ? `${it.size}rem` : undefined,
            animationDuration: `${it.duration}s`,
            animationDelay: `${it.delay}s`,
            '--dx': it.dx,
            '--dy': it.dy,
            '--rot': it.rot,
          }}
        >
          {it.kind === 'thumb' && <FaThumbsUp />}
          {it.kind === 'heart' && <FaHeart />}
          {it.kind === 'star' && <FaStar />}
        </span>
      ))}
    </div>
  )
}
