import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

interface LanguageSwitcherProps {
  className?: string;
  showLabel?: boolean;
}

const languages: Language[] = [
  {
    code: 'en',
    name: '',
    nativeName: 'English',
    flag: '🇺🇸'
  },
  {
    code: 'tr',
    name: '',
    nativeName: 'Türkçe',
    flag: '🇹🇷'
  }
];

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  className = '', 
  showLabel = true 
}) => {
  const { i18n } = useTranslation();
  const [updating, setUpdating] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];
  const nextLanguage = languages.find(lang => lang.code !== i18n.language) || languages[1];

  const toggleLanguage = async () => {
    if (updating) return;
    
    setUpdating(true);
    
    try {
      // Update i18n
      await i18n.changeLanguage(nextLanguage.code);
      
      // Store in localStorage
      localStorage.setItem('language', nextLanguage.code);
      
      // Update user preference in backend
      const token = localStorage.getItem('token');
      if (token) {
        try {
          await fetch('/api/user/language', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
            body: JSON.stringify({ language: nextLanguage.code })
          });
        } catch (error) {
          console.error('Failed to update language preference:', error);
          // Continue anyway since local change worked
        }
      }
      
      // Show success message briefly
      const successMessage = nextLanguage.code === 'tr' 
        ? 'Dil başarıyla değiştirildi' 
        : 'Language changed successfully';
      
      console.log(successMessage);
      
    } catch (error) {
      console.error('Error changing language:', error);
      
      // Show error message
      const errorMessage = nextLanguage.code === 'tr' 
        ? 'Dil değiştirilemedi' 
        : 'Failed to change language';
      
      console.error(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className={className}>
      <button
        onClick={toggleLanguage}
        disabled={updating}
        type="button"
      >
        {updating ? (
          <span className="spinner"></span>
        ) : (
          <>
            <span>{currentLanguage.flag}</span>
            {showLabel && <span>{currentLanguage.nativeName}</span>}
          </>
        )}
      </button>
    </div>
  );
};

export default LanguageSwitcher;