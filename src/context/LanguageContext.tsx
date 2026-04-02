import React, { createContext, useContext, useState } from 'react';
import t, { LangCode, Translations } from '../i18n/translations';

interface LanguageContextValue {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  tr: Translations;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  tr: t['en'],
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>('en');

  const setLang = (l: LangCode) => {
    setLangState(l);
    // RTL support for Arabic
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, tr: t[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
