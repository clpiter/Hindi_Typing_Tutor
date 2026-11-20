import { describe, test, expect } from 'vitest'
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'
import {
  unicodeToKruti,
  krutiToUnicode,
  applyLigatures,
  removeLigatures,
  segmentAksharas,
  normalizeHindi,
  CHAR_TO_KEY,
  nextExpectedKey,
  keysForSequence,
} from '../utils/kruti/index.js'

const require = createRequire(import.meta.url)
const { exercises } = require('../../../backend/seed/exerciseData.js')
const ALL_LINES = exercises.flatMap((ex) => ex.lines.map((l, i) => ({ ex: ex.exerciseNumber, n: i + 1, text: l })))

const typable = (s) => unicodeToKruti(s, { mode: 'typable' })

describe('Unicode → Kruti Dev', () => {
  test.each([
    ['क', 'd'],
    ['कि', 'fd'], // ि is typed BEFORE the consonant
    ['स्थिति', 'fLFkfr'], // ि before the whole conjunct
    ['कर्म', 'deZ'], // reph after the consonant
    ['कीर्ति', 'dhfrZ'],
    ['प्रताप', 'izrki'], // rakar
    ['श्री', 'Jh'],
    ['ज्ञान', 'Kku'],
    ['क्षमा', '{kek'],
    ['त्रिनेत्र', 'f=us='],
    ['द्वार', '}kj'],
    ['उद्योग', 'm|ksx'],
    ['शुद्ध', "'kq)"],
    ['रुपया', '#i;k'],
    ['नेहरू', 'usg:'],
    ['ऋतु', '_rq'],
    ['ईश्वर', "bZ'oj"],
    ['ऐसी', ',slh'],
    ['ओर', 'vksj'],
    ['और', 'vkSj'],
    ['कॉल', 'dkWy'],
    ['ऑयल', 'vkW;y'],
    ['हँसना', 'g¡luk'],
    ['संसार', 'lalkj'],
    ['ज़रा', 't+jk'],
    ['पेड़', 'isM+'],
    ['महान्', 'egku~'],
    ['प्रातः', 'izkr%'],
    ['चिह्न', 'fpg~u'],
    ['राष्ट्र', 'jk"Vz'],
    ['ढर्रे', '<jsZ'],
    ['गईं', 'xbZa'],
    ['है।', 'gSA'],
    ['रहा, जो', 'jgk] tks'],
    ['साथ-साथ', 'lkFk&lkFk'],
    ['807 912', '807 912'],
  ])('%s → %s (typable)', (u, k) => {
    expect(typable(u)).toBe(k)
  })

  test('display mode uses the font ligature glyphs', () => {
    expect(unicodeToKruti('ऊपर')).toBe('Åij')
    expect(unicodeToKruti('हृदय')).toBe('ân;')
    expect(unicodeToKruti('रद्दी')).toBe('jíh')
    expect(unicodeToKruti('चट्टान')).toBe('pêku')
    expect(unicodeToKruti('अपराह्न')).toBe('vijkà')
    expect(unicodeToKruti('ट्रक')).toBe('Vªd')
  })

  test('keyboard drill lines with standalone matras', () => {
    expect(typable('क3क ि4ि ि5ि र6र र7र ा8ा स9स य0य')).toBe('d3d f4f f5f j6j j7j k8k l9l ;0;')
    expect(typable('कमक तिि जिि यख्य यचय सवस ापा रनर रलर')).toBe('ded frf ftf ;[; ;p; lol kik juj jyj')
    expect(typable('अिि बिि कगक यध्य यण्य सएस ाउा रदर रइर')).toBe('fvf fcf dxd ;/; ;.; l,l kmk jnj jbj')
  })
})

describe('Kruti Dev → Unicode', () => {
  test.each([
    ['fd', 'कि'],
    ['fLFkfr', 'स्थिति'],
    ['deZ', 'कर्म'],
    ['/keZ', 'धर्म'],
    ['dRrZO;', 'कर्त्तव्य'],
    ['izrki', 'प्रताप'],
    ["'kq)", 'शुद्ध'],
    ['bZ', 'ई'],
    ['vks', 'ओ'],
    ['dkWy', 'कॉल'],
    ['g¡luk', 'हँसना'],
    ['t+jk', 'ज़रा'],
    ['isM+', 'पेड़'],
    ['egku~', 'महान्'],
    ['izkr%', 'प्रातः'],
    ['gSA', 'है।'],
  ])('%s → %s', (k, u) => {
    expect(krutiToUnicode(k)).toBe(normalizeHindi(u))
  })

  test('alternative key sequences decode to the same text', () => {
    expect(krutiToUnicode('Dk')).toBe('क') // half क + ा = क
    expect(krutiToUnicode('Dkk')).toBe('का')
    expect(krutiToUnicode('mw')).toBe(krutiToUnicode('Å')) // ऊ
    expect(krutiToUnicode('g`')).toBe(krutiToUnicode('â')) // हृ
    expect(krutiToUnicode('n~n')).toBe(krutiToUnicode('í')) // द्द
    expect(krutiToUnicode('Vz')).toBe(krutiToUnicode('Vª')) // ट्र
    expect(krutiToUnicode('dk' + 'W')).toBe('कॉ')
  })

  test('nukta and precomposed letters normalise identically', () => {
    expect(krutiToUnicode('t+')).toBe(normalizeHindi('ज़')) // ज़ precomposed
    expect(normalizeHindi('ड़')).toBe(normalizeHindi('ड़'))
  })

  test('unfinished input decodes without throwing', () => {
    for (const s of ['f', 'fL', 'L', 'Z', 'z', '~', '+', 'k', 'fff', 'v', 'vk', '', '  ']) {
      expect(() => krutiToUnicode(s)).not.toThrow()
    }
  })
})

describe('every PDF exercise line', () => {
  test.each(ALL_LINES.map((l) => [l.ex, l.n, l.text]))('exercise %i line %i round-trips', (ex, n, text) => {
    const ref = normalizeHindi(text)
    expect(krutiToUnicode(typable(text))).toBe(ref)
    expect(krutiToUnicode(unicodeToKruti(text))).toBe(ref)
    expect(applyLigatures(typable(text))).toBe(unicodeToKruti(text))
    expect(krutiToUnicode(removeLigatures(unicodeToKruti(text)))).toBe(ref)
    for (const ch of typable(text)) expect(CHAR_TO_KEY[ch], `key for ${ch}`).toBeDefined()
  })
})

describe('segmentation', () => {
  test('conjuncts, matras and reph stay inside one akshara', () => {
    expect(segmentAksharas('क्षत्रिय')).toEqual(['क्ष', 'त्रि', 'य'])
    expect(segmentAksharas('कर्म धर्म')).toEqual(['क', 'र्म', ' ', 'ध', 'र्म'])
    expect(segmentAksharas('हिंदी')).toEqual(['हिं', 'दी'])
    expect(segmentAksharas('महान्')).toEqual(['म', 'हा', 'न्'])
    expect(segmentAksharas('उज्ज्वल')).toEqual(['उ', 'ज्ज्व', 'ल'])
  })
})

describe('keyboard guidance', () => {
  test('next expected key follows the Kruti sequence', () => {
    expect(nextExpectedKey('कि', '')).toEqual({ ch: 'f' })
    expect(nextExpectedKey('कि', 'f')).toEqual({ ch: 'd' })
    expect(nextExpectedKey('कि', 'fd')).toBeNull()
    expect(nextExpectedKey('कि', 'x')).toEqual({ backspace: true })
  })

  test('shift and finger information', () => {
    const [k] = keysForSequence('D')
    expect(k).toMatchObject({ label: 'D', shift: true, hand: 'L', finger: 3, shiftKey: 'ShiftRight' })
    const [h] = keysForSequence('H')
    expect(h).toMatchObject({ hand: 'R', shiftKey: 'ShiftLeft' })
    expect(keysForSequence('¡')[0]).toMatchObject({ alt: true, label: 'W' })
  })
})

/* ------------------------------------------------------------------
 * Verify against the actual KRDV010.TTF: every code the converter emits
 * must have a glyph in the font's Unicode (3,1) cmap.
 * ---------------------------------------------------------------- */
function readCmap(file) {
  const b = fs.readFileSync(file)
  const numTables = b.readUInt16BE(4)
  let cmapOff = 0
  for (let i = 0; i < numTables; i++) {
    const o = 12 + i * 16
    if (b.toString('ascii', o, o + 4) === 'cmap') cmapOff = b.readUInt32BE(o + 8)
  }
  const n = b.readUInt16BE(cmapOff + 2)
  for (let i = 0; i < n; i++) {
    const p = b.readUInt16BE(cmapOff + 4 + i * 8)
    const e = b.readUInt16BE(cmapOff + 6 + i * 8)
    const off = b.readUInt32BE(cmapOff + 8 + i * 8)
    const s = cmapOff + off
    if (p === 3 && e === 1 && b.readUInt16BE(s) === 4) {
      const segX2 = b.readUInt16BE(s + 6)
      const ranges = []
      for (let k = 0; k < segX2 / 2; k++) {
        ranges.push([b.readUInt16BE(s + 16 + segX2 + k * 2), b.readUInt16BE(s + 14 + k * 2)])
      }
      return (cp) => ranges.some(([a, z]) => cp >= a && cp <= z && cp !== 0xffff)
    }
  }
  throw new Error('no (3,1) format 4 cmap')
}

describe('KRDV010.TTF font', () => {
  const fontPath = path.resolve(__dirname, '../../public/fonts/KRDV010.TTF')

  test('the supplied font file is present and is Kruti Dev 010', () => {
    const buf = fs.readFileSync(fontPath)
    expect(buf.length).toBe(60656)
    expect(buf.includes(Buffer.from('Kruti Dev 010', 'latin1'))).toBe(true)
  })

  test('every character used for the exercises has a glyph in the font', () => {
    const has = readCmap(fontPath)
    const used = new Set()
    for (const { text } of ALL_LINES) {
      for (const ch of unicodeToKruti(text)) used.add(ch)
      for (const ch of typable(text)) used.add(ch)
    }
    for (const k of unicodeToKruti('बहुत बढ़िया! शानदार! बधाई हो! अभ्यास-1 (नीचे) संकेत ँ ं ः ़ ्')) used.add(k)
    const missing = [...used].filter((ch) => ch !== ' ' && !has(ch.codePointAt(0)))
    expect(missing).toEqual([])
  })
})

describe('home-row key drills', () => {
  test('a half letter standing alone is its own half key', () => {
    expect(unicodeToKruti('े क ि ह श् य स ा', { mode: 'typable' })).toBe("s d f g ' ; l k")
    expect(unicodeToKruti('े क ि ह ी श् य स ा र', { mode: 'typable' })).toBe("s d f g h ' ; l k j")
    expect(krutiToUnicode("s d f g ' ; l k")).toBe(normalizeHindi('े क ि ह श् य स ा'))
  })
  test('inside a word a trailing halant is unchanged', () => {
    expect(unicodeToKruti('महान्', { mode: 'typable' })).toBe('egku~')
    expect(unicodeToKruti('पश्चात् अपराह्न', { mode: 'typable' })).toBe("i'pkr~ vijkg~u")
  })
})
