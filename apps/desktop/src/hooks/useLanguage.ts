import { useEffect, useState } from "react";
import { LANGUAGE_STORAGE_KEY, type Language } from "../i18n";

export function useLanguage() {
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return savedLanguage === "zh" ? "zh" : "en";
  });

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  return { language, setLanguage };
}
