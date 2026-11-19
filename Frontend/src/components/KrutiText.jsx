import { useMemo } from 'react'
import { unicodeToKruti } from '../utils/kruti/index.js'
import { splitRuns } from '../utils/textRuns.js'

/**
 * Renders Unicode Hindi with the supplied Kruti Dev font.
 * Screen readers get the Unicode text; the Kruti glyph string is aria-hidden.
 */
export default function KrutiText({ text = '', as: Tag = 'span', className = '', size, ...rest }) {
  const runs = useMemo(() => splitRuns(text), [text])
  const style = size ? { fontSize: size, ...(rest.style || {}) } : rest.style
  return (
    <Tag className={className} {...rest} style={style}>
      <span className="visually-hidden">{text}</span>
      <span aria-hidden="true">
        {runs.map((r, i) =>
          r.type === 'dev' ? (
            <span key={i} className="kruti kruti-inline">
              {unicodeToKruti(r.text)}
            </span>
          ) : (
            <span key={i} className="kruti-latin">
              {r.text}
            </span>
          ),
        )}
      </span>
    </Tag>
  )
}
