import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BrandingConfig {
  app_name: string;
  institution_name: string;
  institution_short: string;
  support_email: string;
  logo_url: string;
  clinic_hours: {
    open: string;
    close: string;
  };
}

interface BrandingContextValue {
  branding: BrandingConfig;
  loading: boolean;
}

// ─── Defaults (shown while loading or if /api/config is unreachable) ──────────

const DEFAULT_BRANDING: BrandingConfig = {
  app_name:          import.meta.env.VITE_APP_NAME          || 'ClinicFlow Pro',
  institution_name:  import.meta.env.VITE_INSTITUTION_NAME  || 'Your Institution',
  institution_short: import.meta.env.VITE_INSTITUTION_SHORT || 'INST',
  support_email:     import.meta.env.VITE_SUPPORT_EMAIL     || 'support@example.com',
  logo_url:          import.meta.env.VITE_LOGO_URL          || '/logo.png',
  clinic_hours: {
    open:  import.meta.env.VITE_CLINIC_OPEN  || '09:00',
    close: import.meta.env.VITE_CLINIC_CLOSE || '17:00',
  },
};

// ─── Context ──────────────────────────────────────────────────────────────────

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  loading: true,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const cached = sessionStorage.getItem('clinicflow_branding');
    if (cached) {
      try {
        setBranding({ ...DEFAULT_BRANDING, ...JSON.parse(cached) });
        setLoading(false);
        return;
      } catch {
        sessionStorage.removeItem('clinicflow_branding');
      }
    }

    fetch(`${API_BASE_URL}/api/config`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          const merged = { ...DEFAULT_BRANDING, ...data };
          setBranding(merged);
          sessionStorage.setItem('clinicflow_branding', JSON.stringify(merged));
        }
      })
      .catch(() => {
        // Network error — defaults stay in place, app still works
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, loading }}>
      {children}
    </BrandingContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBranding(): BrandingConfig {
  return useContext(BrandingContext).branding;
}

export function useBrandingLoading(): boolean {
  return useContext(BrandingContext).loading;
}

export default BrandingContext;