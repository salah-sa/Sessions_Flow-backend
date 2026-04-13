import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Localization Hub
 * Phase 83: Localization Toggle (i18n Bridge)
 * ═══════════════════════════════════════════════════════════
 */

const resources = {
  en: {
    translation: {
      profile: {
        title: "System Identity",
        identity: "User Hub",
        security: "Security Protocols",
        localization: "Node Localization",
        data: "Telemetry Guard",
        logout: "TERMINATE SESSION",
        version: "SF_MOBILE_CORE v2.0.4-PROD"
      },
      sessions: {
        mission_conclude: "CONCLUDE MISSION",
        revenue: "PROJECTED REVENUE",
        notes: "DEPLOYMENT NOTES",
        abort: "ABORT",
        confirm: "CONFIRM CONCLUSION"
      }
    }
  },
  ar: {
    translation: {
      profile: {
        title: "هوية النظام",
        identity: "مركز المستخدم",
        security: "بروتوكولات الأمان",
        localization: "توطين العقدة",
        data: "حارس القياس",
        logout: "إنهاء الجلسة",
        version: "SF_MOBILE_CORE v2.0.4-PROD"
      },
      sessions: {
        mission_conclude: "إنهاء المهمة",
        revenue: "الإيرادات المتوقعة",
        notes: "ملاحظات الانتشار",
        abort: "إلغاء",
        confirm: "تأكيد الإنهاء"
      }
    }
  }
};

const LANGUAGE_KEY = "user-language";

const languageDetector = {
  type: "languageDetector" as const,
  async: true,
  detect: async (callback: (lang: string) => void) => {
    if (typeof window === "undefined") {
      return callback("en"); // Bail out during static rendering / SSR
    }
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage) {
        return callback(savedLanguage);
      }
    } catch (e) {
      // Ignore errors for uninitialized storage
    }
    callback("en");
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    if (typeof window === "undefined") return;
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
    } catch (e) {}
  }
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
