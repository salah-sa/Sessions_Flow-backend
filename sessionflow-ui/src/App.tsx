import React, { useEffect, useState, useCallback } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { useUIStore, useAuthStore } from "./store/stores";
import SplashScreen from "./components/SplashScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SignalRProvider } from "./providers/SignalRProvider";
import { validateSession } from "./api/authService";

const App: React.FC = () => {
  const language = useUIStore((s) => s.language);
  const theme = useUIStore((s) => s.theme);
  const [showSplash, setShowSplash] = useState(true);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    if (language === "ar") {
      document.documentElement.classList.add("font-arabic");
    } else {
      document.documentElement.classList.remove("font-arabic");
    }
  }, [language]);

  useEffect(() => {
    if (theme === "light") {
      document.body.classList.add("theme-light");
    } else {
      document.body.classList.remove("theme-light");
    }
  }, [theme]);

  // Validate stored token on app load — refresh user data or force logout
  useEffect(() => {
    if (token) {
      validateSession().catch(() => {
        // Token invalid — auth store already cleared by validateSession
      });
    }
  }, []); // Only on mount — not on every token change

  const handleSplashFinish = useCallback(() => setShowSplash(false), []);

  return (
    <>
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
      <ErrorBoundary onRetry={() => window.location.reload()}>
        <SignalRProvider>
          <RouterProvider router={router} />
        </SignalRProvider>
      </ErrorBoundary>
    </>
  );
};

export default App;
