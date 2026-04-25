import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en';
import ar from './locales/ar';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    fallbackLng: 'en',
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'infinder_lang',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  });

function applyDir(lang: string) {
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
}

applyDir(i18n.language);
i18n.on('languageChanged', applyDir);

export default i18n;
