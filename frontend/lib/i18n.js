"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

// Small dictionary-based i18n (English + বাংলা). Any key missing from a
// language falls back to English, so untranslated screens never show blanks.
// Add a string: put the English text in `en`, the Bangla in `bn`, and call t("key").
import { DICTIONARY, translate } from "./translations";

export { DICTIONARY, translate };

const LangContext = createContext({ lang: "en", setLang: () => {}, t: (k) => translate("en", k) });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("lang");
      if (saved === "bn" || saved === "en") setLangState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l) => {
    setLangState(l);
    try { localStorage.setItem("lang", l); } catch {}
  }, []);

  const t = useCallback((key) => translate(lang, key), [lang]);
  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export const useT = () => useContext(LangContext);
