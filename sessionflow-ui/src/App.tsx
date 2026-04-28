import React, { useEffect, useState, useCallback } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { useUIStore, useAuthStore } from "./store/stores";
import { UIStyleManager, UIStyleConfig } from "./styles/UIStyleManager";
import SplashScreen from "./components/SplashScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SignalRProvider } from "./providers/SignalRProvider";
import { validateSession } from "./api/authService";

import { CustomerServiceFab } from "./components/support/CustomerServiceFab";
import { SystemUpdatePopup } from "./components/support/SystemUpdatePopup";
import { StudentWelcomeModal } from "./components/StudentWelcomeModal";

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const token = useAuthStore((s) => s.token);

  // Obsidian Protocol: Universal Mouse Refraction Tracking (RAF-throttled)
  useEffect(() => {
    let rafId: number | null = null;
    const handleMouseMove = (e: MouseEvent) => {
      if (rafId !== null) return; // Skip if a frame is already pending
      rafId = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        document.documentElement.style.setProperty('--mouse-x', `${x}%`);
        document.documentElement.style.setProperty('--mouse-y', `${y}%`);
        rafId = null;
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  // Initialize UI Style System
  useEffect(() => {
    UIStyleManager.apply(UIStyleConfig.current);
  }, []);

  // Identity Mirror: Automatic Location Detection for Students
  useEffect(() => {
    if (token) {
      const { user, setStudentLocation } = useAuthStore.getState();
      if (user?.role === "Student") {
        fetch("https://ipapi.co/json/")
          .then(res => res.json())
          .then(data => {
            if (data.city) {
              setStudentLocation(data.city);
              console.log(`[Identity Mirror] Detected location: ${data.city}`);
            }
          })
          .catch(err => console.error("Location detection failed", err));
      }
    }
  }, [token]);

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
          <StudentWelcomeModal />
          <CustomerServiceFab />
          <SystemUpdatePopup />
        </SignalRProvider>
      </ErrorBoundary>
    </>
  );
};

export default App;
