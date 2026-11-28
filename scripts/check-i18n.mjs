import { translations, SUPPORTED_LANGS } from '../src/ui/i18n.js';

const EXPECTED_LANGS = ['uk', 'en', 'pl', 'ru', 'ko'];
const UK_ONLY_CYRILLIC_RE = /[єіїґЄІЇҐ]/;
const errors = [];

for (const lang of EXPECTED_LANGS) {
  if (!SUPPORTED_LANGS.includes(lang)) {
    errors.push(`SUPPORTED_LANGS is missing expected locale: ${lang}`);
  }
}

for (const lang of SUPPORTED_LANGS) {
  if (!EXPECTED_LANGS.includes(lang)) {
    errors.push(`Unexpected locale in SUPPORTED_LANGS: ${lang}`);
  }
  if (!translations[lang] || typeof translations[lang] !== 'object') {
    errors.push(`Missing locale dictionary: ${lang}`);
  }
}

if (errors.length === 0) {
  const baseKeys = Object.keys(translations.uk);

  for (const lang of EXPECTED_LANGS) {
    const dict = translations[lang];
    const langKeys = Object.keys(dict);

    for (const key of baseKeys) {
      if (!Object.hasOwn(dict, key)) {
        errors.push(`[${lang}] Missing key: ${key}`);
      } else if (typeof dict[key] !== 'string' || dict[key].trim() === '') {
        errors.push(`[${lang}] Empty or non-string value for key: ${key}`);
      }
    }

    for (const key of langKeys) {
      if (!Object.hasOwn(translations.uk, key)) {
        errors.push(`[${lang}] Extra key not in uk: ${key}`);
      }
    }

    if (lang !== 'uk') {
      for (const [key, val] of Object.entries(dict)) {
        if (typeof val === 'string' && UK_ONLY_CYRILLIC_RE.test(val)) {
          errors.push(`[${lang}] Ukrainian-specific Cyrillic leak (є/ї/і/ґ) in "${key}": ${val}`);
        }
      }
    }
  }
}

if (errors.length > 0) {
  console.error('i18n check FAILED:');
  for (const err of errors) {
    console.error(` - ${err}`);
  }
  process.exit(1);
}

const keyCount = Object.keys(translations.uk).length;
console.log(`i18n check passed: ${EXPECTED_LANGS.length} locales (${EXPECTED_LANGS.join(', ')}), ${keyCount} keys each, 0 leaks.`);
