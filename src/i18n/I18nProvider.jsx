import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, translations } from "./translations.js";

const I18nContext = createContext(null);
const supportedLanguages = new Set(["ar", "en"]);

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_LANGUAGE;
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return supportedLanguages.has(storedLanguage) ? storedLanguage : DEFAULT_LANGUAGE;
  });

  const direction = language === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [direction, language]);

  const value = useMemo(
    () => ({
      language,
      direction,
      setLanguage(nextLanguage) {
        if (supportedLanguages.has(nextLanguage)) {
          setLanguageState(nextLanguage);
        }
      },
      toggleLanguage() {
        setLanguageState((currentLanguage) => (currentLanguage === "ar" ? "en" : "ar"));
      },
      t(key) {
        return translations[language]?.[key] ?? translations[DEFAULT_LANGUAGE]?.[key] ?? key;
      },
    }),
    [direction, language]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return context;
}
