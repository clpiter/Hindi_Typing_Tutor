import { memo, Fragment } from 'react'
import { unicodeToKruti } from '../utils/kruti/index.js'

const STATUS_TITLE = {
  correct: 'सही',
  incorrect: 'गलत',
  missing: 'छूटा हुआ',
  current: 'टाइप हो रहा है',
  pending: '',
}

/**
 * Reference line coloured akshara by akshara:
 *   green = correct, red wavy underline = incorrect / missing / extra, neutral = not typed yet.
 * Each akshara is rendered with the Kruti Dev font from its own Kruti encoding.
 * Kruti Dev is not a shaping font, so splitting a word into spans renders exactly
 * like the whole word.
 */
function MistakeHighlighter({ comparison, reference, className = '' }) {
  const clusters = comparison?.clusters ?? []
  const extrasByIndex = new Map()
  for (const e of comparison?.extras ?? []) {
    extrasByIndex.set(e.afterIndex, [...(extrasByIndex.get(e.afterIndex) || []), e])
  }

  return (
    <div className={`reference-text kruti ${className}`} title={reference} data-testid="reference-line">
      <span className="visually-hidden">{reference}</span>
      <span aria-hidden="true">
        {clusters.map((c, i) => (
          <Fragment key={i}>
            {c.isSpace ? (
              <span className={`ak ak-space ak-${c.status}`} data-status={c.status}>
                {' '}
              </span>
            ) : (
              <span
                className={`ak ak-${c.status}`}
                data-status={c.status}
                title={c.status === 'incorrect' && c.typed ? `${STATUS_TITLE.incorrect}: ${c.typed}` : STATUS_TITLE[c.status]}
              >
                {unicodeToKruti(c.ref)}
              </span>
            )}
            {extrasByIndex.get(i)?.map((e, j) => (
              <span key={j} className="ak ak-extra" data-status="extra" title="अतिरिक्त">
                {unicodeToKruti(e.text)}
              </span>
            ))}
          </Fragment>
        ))}
      </span>
    </div>
  )
}

export default memo(MistakeHighlighter)
