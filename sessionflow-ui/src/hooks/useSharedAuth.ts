import { useState, useRef, useCallback } from "react";
import { MascotState, AuthMode } from "../components/auth/types";
import { useNavigate } from "react-router-dom";

export const useSharedAuth = () => {
  const navigate = useNavigate();
  const [loginMode, setLoginMode] = useState<AuthMode>("engineer");
  const [mascotState, setMascotState] = useState<MascotState>("idle");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [rememberMe, setRememberMe] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleFieldFocus = useCallback((fieldType: string) => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    if (fieldType === "password") {
      setMascotState("password");
    } else {
      setMascotState("watching");
    }
  }, []);

  const handleFieldBlur = useCallback(() => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    blurTimeoutRef.current = setTimeout(() => setMascotState("idle"), 300);
  }, []);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Calculate strength: length + character variety
    let strength = 0;
    if (val.length >= 6) strength += 0.25;
    if (val.length >= 10) strength += 0.15;
    if (/[A-Z]/.test(val)) strength += 0.2;
    if (/[0-9]/.test(val)) strength += 0.2;
    if (/[^A-Za-z0-9]/.test(val)) strength += 0.2;
    setPasswordStrength(Math.min(strength, 1));
  }, []);

  const onNavigate = (path: string) => {
    navigate(path);
  };

  return {
    loginMode,
    setLoginMode,
    mascotState,
    setMascotState,
    passwordStrength,
    rememberMe,
    setRememberMe,
    handleFieldFocus,
    handleFieldBlur,
    handlePasswordChange,
    onNavigate
  };
};
