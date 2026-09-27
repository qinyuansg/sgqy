// ─────────────────────────────────────────────────────────────
// CUBE DASH — tiny i18n. Chinese first, English toggle.
// Every module registers its own strings with addStrings() so no two
// modules ever need to edit the same dictionary file.
//
//   addStrings({ zh: { key: '文本' }, en: { key: 'Text' } })
//   t('key')                 → string in current language
//   t('hello', { n: 3 })     → '{n}' placeholders replaced
// ─────────────────────────────────────────────────────────────

const dict = { zh: {}, en: {} };
let lang = 'zh';
const listeners = new Set();

export function addStrings(tables) {
  for (const l of Object.keys(tables)) {
    dict[l] = dict[l] || {};
    Object.assign(dict[l], tables[l]);
  }
}

export function t(key, vars) {
  let s = dict[lang]?.[key] ?? dict.zh[key] ?? dict.en[key] ?? key;
  if (vars) for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]));
  return s;
}

/** pick the right field of a bilingual record {zh:'', en:''} */
export function tl(rec) {
  if (rec == null) return '';
  if (typeof rec === 'string') return rec;
  return rec[lang] ?? rec.zh ?? rec.en ?? '';
}

export function getLang() { return lang; }
export function setLang(l) {
  lang = l === 'en' ? 'en' : 'zh';
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  for (const fn of listeners) fn(lang);
}
export function onLangChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function detectLang() {
  const n = (navigator.language || 'zh').toLowerCase();
  return n.startsWith('zh') ? 'zh' : 'en';
}

// Core strings used by several modules
addStrings({
  zh: {
    'game.title': '方块大逃跑',
    'game.sub': 'CUBE DASH',
    'game.tagline': '躲得漂亮，冲得刚好',
    'common.ok': '好的',
    'common.back': '返回',
    'common.claim': '领取',
    'common.claimed': '已领取',
    'common.locked': '未解锁',
    'common.play': '开始',
    'common.continue': '继续',
    'common.retry': '再来一次',
    'common.home': '主页',
    'common.next': '下一关',
    'common.close': '关闭',
    'common.coins': '金币',
    'common.gems': '宝石',
  },
  en: {
    'game.title': 'CUBE DASH',
    'game.sub': '方块大逃跑',
    'game.tagline': 'Dodge with style. Dash just right.',
    'common.ok': 'OK',
    'common.back': 'Back',
    'common.claim': 'Claim',
    'common.claimed': 'Claimed',
    'common.locked': 'Locked',
    'common.play': 'Play',
    'common.continue': 'Continue',
    'common.retry': 'Retry',
    'common.home': 'Home',
    'common.next': 'Next',
    'common.close': 'Close',
    'common.coins': 'Coins',
    'common.gems': 'Gems',
  },
});
