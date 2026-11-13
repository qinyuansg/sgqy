// Message catalogues live in /i18n/<lang>.json; keys are dotted paths.

const catalogues = new Map();
let current = "en";
let fallback = "en";

export async function loadLanguages(languages, defaultLanguage) {
  const loaded = await Promise.all(
    languages.map(async (lang) => {
      const response = await fetch(`i18n/${lang}.json`);
      if (!response.ok) throw new Error(`missing catalogue ${lang}`);
      return [lang, await response.json()];
    }),
  );
  loaded.forEach(([lang, catalogue]) => catalogues.set(lang, catalogue)); // keep configured order
  fallback = defaultLanguage;
  current = defaultLanguage;
}

export const languages = () => [...catalogues.keys()];
export const language = () => current;

export function setLanguage(lang) {
  if (catalogues.has(lang)) {
    current = lang;
    document.documentElement.lang = lang;
  }
}

function lookup(lang, key) {
  return key.split(".").reduce((node, part) => (node && typeof node === "object" ? node[part] : undefined), catalogues.get(lang));
}

/** Translate *key*, substituting {name} placeholders from *vars*. */
export function t(key, vars = {}) {
  let text = lookup(current, key) ?? lookup(fallback, key);
  if (typeof text !== "string") return key;
  return text.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? String(vars[name]) : `{${name}}`));
}

/** Name of *lang* in its own language. */
export const nativeName = (lang) => lookup(lang, "meta.name") ?? lang;
