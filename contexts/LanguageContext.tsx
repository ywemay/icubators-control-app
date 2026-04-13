import React, { createContext, useState, useContext, useEffect } from 'react';
import i18n from '../services/i18n';
import { Language } from '../services/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, options?: object) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(i18n.getLanguage());

  useEffect(() => {
    // Update state when language changes externally
    const updateLanguage = () => {
      setLanguageState(i18n.getLanguage());
    };
    
    // You might want to add an event listener here if i18n supports it
    // For now, we'll rely on the setLanguage function to update state
  }, []);

  const setLanguage = async (lang: Language) => {
    await i18n.setLanguage(lang);
    setLanguageState(lang);
  };

  const t = (key: string, options?: object) => {
    return i18n.t(key, options);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};