import * as Localization from "expo-localization";
import { I18n } from "i18n-js";
import settingsService from "./settings";

// Import translations
import en from "../locales/en.json";
import zh from "../locales/zh.json";

// Create i18n instance
const i18n = new I18n({
  en,
  zh,
});

// Set the locale once at the beginning of your app
i18n.locale = Localization.getLocales()[0]?.languageCode || "en";

// When a value is missing from a language it'll fall back to another language with the key present
i18n.enableFallback = true;

// Set default locale to English
i18n.defaultLocale = "en";

export type Language = "en" | "zh";

class LocalizationService {
  private currentLanguage: Language = "en";

  constructor() {
    this.loadLanguage();
  }

  async loadLanguage(): Promise<void> {
    try {
      await settingsService.initialize();
      const settings = await settingsService.getSettings();
      
      if (settings.language) {
        this.setLanguage(settings.language);
      } else {
        // Use device language if Chinese, otherwise default to English
        const deviceLang = Localization.getLocales()[0]?.languageCode || "en";
        if (deviceLang === "zh") {
          this.setLanguage("zh");
        } else {
          this.setLanguage("en");
        }
      }
    } catch (error) {
      console.error("Failed to load language:", error);
      this.setLanguage("en");
    }
  }

  async setLanguage(language: Language): Promise<void> {
    this.currentLanguage = language;
    i18n.locale = language;
    try {
      await settingsService.updateSettings({ language });
    } catch (error) {
      console.error("Failed to save language setting:", error);
    }
  }

  getLanguage(): Language {
    return this.currentLanguage;
  }

  getAvailableLanguages(): { code: Language; name: string }[] {
    return [
      { code: "en", name: i18n.t("app.english") },
      { code: "zh", name: i18n.t("app.chinese") },
    ];
  }

  t(key: string, options?: object): string {
    return i18n.t(key, options);
  }
}

export default new LocalizationService();