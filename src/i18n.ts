// src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend'; // สำหรับโหลด JSON

i18n
  .use(HttpBackend) // โหลดจาก /locales/{{lng}}.json
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: 'en', // default
    fallbackLng: 'en',
    backend: {
      loadPath: '/locales/{{lng}}.json', // ต้องวาง JSON ใน public/locales/
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;