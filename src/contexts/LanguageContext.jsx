import { createContext, useContext, useEffect, useState } from "react";
import { translations } from "../i18n/translations.js";

const LanguageContext = createContext(null);
const STORAGE_KEY = "ligia:lang";

function getInitialLang() {
  if (typeof window === "undefined") return "pt";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "pt" || saved === "en") return saved;
  } catch {}
  return "pt";
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(getInitialLang);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, lang); } catch {}
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
    }
  }, [lang]);

  const toggleLang = () => setLang(l => (l === "pt" ? "en" : "pt"));

  const value = { lang, setLang, toggleLang, t: translations[lang] };
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
