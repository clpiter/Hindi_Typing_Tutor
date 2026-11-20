import { describe, test, expect } from 'vitest'
import { compareLine, krutiToUnicode, isCompatiblePrefix, detectLineEnd } from '../utils/kruti/index.js'

const statuses = (cmp) => cmp.clusters.filter((c) => !c.isSpace).map((c) => c.status)

describe('compareLine', () => {
  const ref = 'कह कर कस'

  test('nothing typed: all pending, no errors', () => {
    const r = compareLine(ref, '')
    expect(statuses(r).every((s) => s === 'pending')).toBe(true)
    expect(r.errorCount).toBe(0)
    expect(r.isComplete).toBe(false)
  })

  test('correct prefix is green and the rest neutral', () => {
    const r = compareLine(ref, 'कह क')
    expect(statuses(r)).toEqual(['correct', 'correct', 'correct', 'pending', 'pending', 'pending'])
    expect(r.hasErrors).toBe(false)
  })

  test('a wrong letter is marked incorrect immediately', () => {
    const r = compareLine(ref, 'कस')
    expect(statuses(r)[1]).toBe('incorrect')
    expect(r.errors[0]).toMatchObject({ type: 'character', expected: 'ह', actual: 'स' })
  })

  test('a wrong matra is classified as a matra error', () => {
    const r = compareLine('किस सिर', 'कीस')
    expect(r.errors[0]).toMatchObject({ type: 'matra', expected: 'कि', actual: 'की' })
  })

  test('missing letters are reported once the learner moves on', () => {
    const r = compareLine(ref, 'क कर')
    expect(statuses(r).slice(0, 2)).toEqual(['correct', 'missing'])
    expect(r.errors.some((e) => e.type === 'missing')).toBe(true)
    // the following word is still aligned correctly
    expect(statuses(r).slice(2, 4)).toEqual(['correct', 'correct'])
  })

  test('extra letters and extra words', () => {
    const r = compareLine(ref, 'कहह कर')
    expect(r.extras[0]).toMatchObject({ text: 'ह' })
    expect(r.errors.some((e) => e.type === 'extra')).toBe(true)
    const r2 = compareLine('कह', 'कह कर')
    expect(r2.errors.some((e) => e.type === 'extra')).toBe(true)
    expect(r2.isComplete).toBe(false)
  })

  test('double spaces are space errors but do not break alignment', () => {
    const r = compareLine(ref, 'कह  कर')
    expect(r.errors.filter((e) => e.type === 'space')).toHaveLength(1)
    expect(statuses(r).slice(0, 4)).toEqual(['correct', 'correct', 'correct', 'correct'])
    expect(r.isComplete).toBe(false)
  })

  test('word order mistakes are detected', () => {
    const r = compareLine('कह कर कस', 'कर कह ')
    expect(r.errors.some((e) => e.type === 'wordOrder')).toBe(true)
  })

  test('a line completes only when it is exactly right', () => {
    expect(compareLine(ref, 'कह कर कस').isComplete).toBe(true)
    expect(compareLine(ref, 'कह कर कस ').isComplete).toBe(true) // trailing space allowed
    expect(compareLine(ref, 'कह कर क').isComplete).toBe(false)
    expect(compareLine(ref, 'कह कर कश').isComplete).toBe(false)
  })

  test('half-typed Kruti Dev aksharas are neutral, not red', () => {
    // typing कि in Kruti Dev starts with "f" (ि)
    let r = compareLine('किस', krutiToUnicode('f'))
    expect(statuses(r)[0]).toBe('current')
    expect(r.hasErrors).toBe(false)
    // कर्म: "de" typed, reph "Z" still to come
    r = compareLine('कर्म', krutiToUnicode('de'))
    expect(statuses(r)).toEqual(['correct', 'current'])
    // को: "dk" (का) is on the way to "dks" (को)
    r = compareLine('को', krutiToUnicode('dk'))
    expect(statuses(r)).toEqual(['current'])
    // श: half श (') typed, ा will complete it
    r = compareLine('शक', krutiToUnicode("'"))
    expect(statuses(r)[0]).toBe('current')
  })

  test('a half-typed akshara becomes red once the learner moves past it', () => {
    const r = compareLine('को कह', krutiToUnicode('dk dg'))
    expect(statuses(r)[0]).toBe('incorrect')
  })

  test('Kruti Dev input with an alternative key sequence is accepted', () => {
    // "Dk" (half क + ा) is the same letter as "d"
    expect(compareLine('कह', krutiToUnicode('Dkg')).isComplete).toBe(true)
  })

  test('Unicode IME input: precomposed nukta, ZWJ and ASCII colon are normalised', () => {
    expect(compareLine('ज़रा', 'ज़रा').isComplete).toBe(true)
    expect(compareLine('क्ष', 'क्‍ष').isComplete).toBe(true)
    expect(compareLine('अतः', 'अत:').isComplete).toBe(true)
  })

  test('isCompatiblePrefix', () => {
    expect(isCompatiblePrefix('ि', 'कि')).toBe(true)
    expect(isCompatiblePrefix('क्', 'क्ष')).toBe(true)
    expect(isCompatiblePrefix('इ', 'ई')).toBe(true)
    expect(isCompatiblePrefix('आ', 'ओ')).toBe(true)
    expect(isCompatiblePrefix('ग', 'क')).toBe(false)
  })
})

describe('detectLineEnd', () => {
  const ref = 'कहर कसर कयास सरकार हरकारा'
  test('exact text, word count, length and last word end the line', () => {
    expect(detectLineEnd(ref, ref)).toEqual({ ended: true, reason: 'exact' })
    expect(detectLineEnd(ref, 'कहर कसर कयास सरकार हरकरा')).toMatchObject({ ended: true, reason: 'wordCount' })
    expect(detectLineEnd(ref, 'कहर कसर कयास सरकारहरकारा')).toMatchObject({ ended: true })
    expect(detectLineEnd(ref, 'कहर कसर सरकार हरकारा')).toMatchObject({ ended: true, reason: 'lastWord' })
  })
  test('does not end too early', () => {
    expect(detectLineEnd(ref, '')).toEqual({ ended: false })
    expect(detectLineEnd(ref, 'कहर कसर')).toEqual({ ended: false })
    // the last word appears early in a drill – not enough of the line typed yet
    expect(detectLineEnd('कहिकि यसारीर कहिकि यसारीर कहिकि यसारीर', 'कहिकि यसारीर')).toEqual({ ended: false })
  })
})

describe('key-drill lines (one sign per word)', () => {
  const drill = 'े क ि ह श् य स ा'
  test('the line does not end before its last key', () => {
    expect(detectLineEnd(drill, 'े क ि ह श् य स')).toEqual({ ended: false })
    expect(detectLineEnd(drill, 'े क ि ह श् य स ा')).toMatchObject({ ended: true, reason: 'exact' })
  })
})
