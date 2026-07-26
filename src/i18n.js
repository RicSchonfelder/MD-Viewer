import i18n from 'i18next';
import en from './locales/en.json';
import ptBR from './locales/pt-BR.json';
import es from './locales/es.json';
import fr from './locales/fr.json';

i18n.init({
  resources: {
    en: { translation: en },
    'pt-BR': { translation: ptBR },
    es: { translation: es },
    fr: { translation: fr },
  },
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  detection: undefined,
});

const SUPPORTED_LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
];

function getSystemLocale() {
  const lang = navigator.language;
  if (lang.startsWith('pt')) return 'pt-BR';
  if (lang.startsWith('es')) return 'es';
  if (lang.startsWith('fr')) return 'fr';
  return 'en';
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const attrs = el.getAttribute('data-i18n-attrs');
    const text = i18n.t(key);
    if (attrs) {
      attrs.split(',').forEach((attr) => {
        const a = attr.trim();
        if (a === 'title') el.title = text;
        else if (a === 'placeholder') el.placeholder = text;
        else el.setAttribute(a, text);
      });
    } else {
      el.textContent = text;
    }
  });
}

const localeListeners = [];

function onLocaleChanged(fn) {
  localeListeners.push(fn);
}

i18n.on('languageChanged', () => {
  applyTranslations();
  localeListeners.forEach((fn) => fn());
});

function setLocale(locale) {
  i18n.changeLanguage(locale);
  localStorage.setItem('md-viewer-locale', locale);
}

function getCurrentLocale() {
  return i18n.language;
}

function getSupportedLocales() {
  return SUPPORTED_LOCALES;
}

const saved = localStorage.getItem('md-viewer-locale');
i18n.changeLanguage(saved || getSystemLocale());

export { i18n as default, applyTranslations, setLocale, getCurrentLocale, getSupportedLocales, onLocaleChanged };
