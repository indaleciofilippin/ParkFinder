import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import { en } from './en';
import { es } from './es';

const translations = {
  en,
  es,
};

export const i18n = new I18n(translations);

// Set the locale once at the beginning of your app.
i18n.locale = Localization.getLocales()[0].languageCode ?? 'en';
// Fallback to english if translation is missing in the primary language
i18n.enableFallback = true;
i18n.defaultLocale = 'en';
