// i18n.ts
// Numtap | Gazetica Studio | Sprint 3 Day 2-3 | Task T-010
//
// i18next bootstrap. Registers all 6 locale resources. Initial language is 'en';
// settingsStore syncs the real language via i18n.changeLanguage on hydration.

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import ko from './locales/ko.json';
import pt from './locales/pt.json';
import es from './locales/es.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
    fr: { translation: fr },
    ko: { translation: ko },
    pt: { translation: pt },
    es: { translation: es },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
