import React, { useEffect, useState, useCallback } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { useUIStore, useAuthStore } from "./store/stores";
import { UIStyleManager, UIStyleConfig } from "./styles/UIStyleManager";
import SplashScreen from "./components/SplashScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SignalRProvider } from "./providers/SignalRProvider";
import { validateSession } from "./api/authService";

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const token = useAuthStore((s) => s.token);

  // Obsidian Protocol: Universal Mouse Refraction Tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty('--mouse-x', `${x}%`);
      document.documentElement.style.setProperty('--mouse-y', `${y}%`);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Initialize UI Style System
  useEffect(() => {
    UIStyleManager.apply(UIStyleConfig.current);
  }, []);

  // Validate stored token on app load
  useEffect(() => {
    if (token) {
      validateSession().catch(() => {
        // Token invalid handled by service
      });
    }
  }, [token]);

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
