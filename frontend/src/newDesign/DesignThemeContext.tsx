import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { GOOGLE_FONTS_URL } from "./theme";

export type DesignTheme = "classic" | "new";

const STORAGE_KEY = "groundwork:designTheme";
const FONT_LINK_ID = "new-design-fonts";

interface DesignThemeContextValue {
  theme: DesignTheme;
  setTheme: (theme: DesignTheme) => void;
}

const DesignThemeContext = createContext<DesignThemeContextValue | null>(null);

function readStoredTheme(): DesignTheme {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "new" ? "new" : "classic";
}

export function DesignThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<DesignTheme>(readStoredTheme);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);

    const existingLink = document.getElementById(FONT_LINK_ID);
    if (theme === "new" && !existingLink) {
      const link = document.createElement("link");
      link.id = FONT_LINK_ID;
      link.rel = "stylesheet";
      link.href = GOOGLE_FONTS_URL;
      document.head.appendChild(link);
    } else if (theme === "classic" && existingLink) {
      existingLink.remove();
    }
  }, [theme]);

  function setTheme(next: DesignTheme) {
    setThemeState(next);
  }

  return (
    <DesignThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </DesignThemeContext.Provider>
  );
}

export function useDesignTheme() {
  const context = useContext(DesignThemeContext);
  if (!context) {
    throw new Error("useDesignTheme must be used within a DesignThemeProvider");
  }
  return context;
}
