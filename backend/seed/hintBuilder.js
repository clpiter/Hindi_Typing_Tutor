/**
 * Builds a Hindi hint for each exercise line from what the line actually contains
 * (matras, half letters, reph, rakar, conjuncts …). Key names refer to the Kruti
 * Dev / Remington layout shown on PDF page 72.
 */
const ROW_TEXT = {
  home: 'होम कीज़ (नीचे से दूसरी पंक्ति)',
  top: 'नीचे से तीसरी पंक्ति',
  bottom: 'नीचे से पहली पंक्ति',
  number: 'नीचे से चौथी (अंक) पंक्ति',
}

const RULES = [
  [/ि/, 'छोटी इ की मात्रा (ि) व्यंजन से पहले टाइप करें: पहले f, फिर व्यंजन — जैसे कि = f d।'],
  [/र्(?=[क-ह])/, 'रेफ (र्) के लिए अगला व्यंजन व उसकी मात्रा टाइप करने के बाद Shift + Z दबाएँ — जैसे कर्म = d e Z।'],
  [/[क-ह]़?्र/, 'रकार (्र) के लिए व्यंजन के बाद z दबाएँ — जैसे प्र = i z; श्र के लिए Shift + J।'],
  [/[खशषणथधघभ]/, 'ख, श, ष, ण, थ, ध, घ, भ के आधे रूप की कुँजी के बाद ा (k) दबाकर पूरा अक्षर बनाएँ — जैसे श = \' k।'],
  [/क्ष/, 'क्ष के लिए Shift + [ और फिर k दबाएँ।'],
  [/ज्ञ/, 'ज्ञ के लिए Shift + K दबाएँ।'],
  [/त्र/, 'त्र के लिए = कुँजी दबाएँ।'],
  [/द्ध/, 'द्ध के लिए Shift + 0 दबाएँ।'],
  [/द्य/, 'द्य के लिए Shift + \\ दबाएँ।'],
  [/द्व/, 'द्व के लिए Shift + ] दबाएँ।'],
  [/[कखगघचजझणतथधनपफबभमयलवशषस]्[क-ह]/, 'आधे अक्षर (संयुक्ताक्षर) के लिए Shift के साथ उसी व्यंजन की कुँजी दबाएँ — जैसे क् = Shift + D।'],
  [/[ङछटठडढदह]्[क-ह]/, 'ट, ठ, ड, ढ, छ, द, ह के आधे रूप के लिए व्यंजन के बाद हल् (Shift + `) लगाएँ।'],
  [/्(\s|$|।)/, 'हलंत (्) के लिए Shift + ` दबाएँ — जैसे महान् = e g k u ~।'],
  [/[ोौ]/, 'ो = k + s तथा ौ = k + Shift + S।'],
  [/ॉ/, 'ॉ = k + Shift + W।'],
  [/ं/, 'अनुस्वार (ं) के लिए a दबाएँ।'],
  [/ँ/, 'चंद्रबिंदु (ँ) के लिए Alt + W (या Alt + 0161) दबाएँ।'],
  [/ृ/, 'ऋ की मात्रा (ृ) के लिए ` (अंक 1 के बाईं ओर) दबाएँ।'],
  [/ऋ/, 'ऋ के लिए Shift + - दबाएँ।'],
  [/ई/, 'ई = b + Shift + Z।'],
  [/ऊ/, 'ऊ = m + w (या Alt + 0197)।'],
  [/[रू]ु|रु|रू/, 'रु के लिए Shift + 3 तथा रू के लिए Shift + ; दबाएँ।'],
  [/़/, 'नुक्ता (़) के लिए व्यंजन के बाद Shift + = दबाएँ — जैसे ज़ = t +।'],
  [/ः/, 'विसर्ग (ः) के लिए Shift + 5 दबाएँ।'],
  [/।/, 'पूर्ण विराम (।) के लिए Shift + A दबाएँ।'],
  [/,/, 'अल्पविराम (,) के लिए ] दबाएँ।'],
  [/-/, 'योजक चिह्न (-) के लिए Shift + 7 दबाएँ।'],
  [/\d/, 'अंक सीधे अंक पंक्ति से टाइप करें; उंगली तुरंत होम कीज़ पर लौटाएँ।'],
]

function lineDifficulty(text) {
  if (text.length > 120) return 'hard'
  if (/्|ृ|़|ँ/.test(text) || text.length > 45) return 'medium'
  return 'easy'
}

/** A key drill: every "word" is one sign = one key (e.g. "े क ि ह श् य स ा") */
function isKeyDrill(text) {
  return text.trim().split(/\s+/).every((w) => Array.from(w).length <= 2)
}

function buildHint(text, exercise) {
  if (isKeyDrill(text)) {
    return [
      `यह ${ROW_TEXT[exercise.keyboardRow]} का कुँजी-अभ्यास है: हर चिह्न एक कुँजी है, हर कुँजी के बाद Space दबाएँ।`,
      'उंगलियाँ होम कीज़ पर रखें — बायाँ हाथ A S D F, दायाँ हाथ J K L ;। G और H के लिए तर्जनी को थोड़ा खिसकाएँ।',
      'Shift के बिना: a = ं, s = े, d = क, f = ि, g = ह, h = ी, j = र, k = ा, l = स, ; = य, \' = श्।',
    ].join(' ')
  }
  const parts = [`इस पंक्ति में ${ROW_TEXT[exercise.keyboardRow]} का अभ्यास है।`]
  if (exercise.shiftPractice) {
    parts.push('दाएँ हाथ के अक्षरों के लिए बाईं Shift तथा बाएँ हाथ के अक्षरों के लिए दाईं Shift दबाएँ।')
  }
  for (const [re, msg] of RULES) if (re.test(text) && !parts.includes(msg)) parts.push(msg)
  if (text.length > 120) parts.push('यह लंबा अनुच्छेद है — गति से अधिक शुद्धता पर ध्यान दें।')
  return parts.join(' ')
}

module.exports = { buildHint, lineDifficulty }
