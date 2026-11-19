import KrutiText from '../components/KrutiText.jsx'
import { unicodeToKruti } from '../utils/kruti/index.js'

const LETTERS = [
  ['क', '8%', '12%', 120],
  ['ख', '70%', '8%', 90],
  ['ज्ञ', '15%', '70%', 140],
  ['श्र', '75%', '72%', 110],
  ['अ', '45%', '40%', 200],
]

/** Decorative left panel for the login and register pages */
export default function AuthAside() {
  return (
    <aside className="auth-aside">
      {LETTERS.map(([l, left, top, size]) => (
        <span key={l} className="floating-letter" style={{ left, top, fontSize: size }} aria-hidden="true">
          {unicodeToKruti(l)}
        </span>
      ))}
      <div style={{ position: 'relative', maxWidth: 460 }}>
        <div className="mb-3 opacity-75 text-uppercase small fw-semibold">Hindi Typing Practice Tutor</div>
        <h1 className="display-6 fw-bold mb-3">
          <KrutiText text="हिंदी टाइपिंग सीखें" />
        </h1>
        <p className="fs-5 opacity-90">
          Learn Hindi typing on the Kruti Dev / Remington keyboard with the exercises of
          <em> हिंदी शब्द संसाधन</em>, instant mistake detection and progress tracking.
        </p>
        <ul className="list-unstyled mt-4 opacity-90">
          <li className="mb-2">✓ 8 graded exercises from the PDF – home keys to shift practice</li>
          <li className="mb-2">✓ Real-time red underlining of wrong letters &amp; matras</li>
          <li className="mb-2">✓ Speed, accuracy and daily progress charts</li>
        </ul>
      </div>
    </aside>
  )
}
