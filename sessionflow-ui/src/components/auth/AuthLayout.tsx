import React from "react";
import { TopBarControls } from "./TopBarControls";

interface AuthLayoutProps {
  children: React.ReactNode;
  theme?: "dark" | "light";
  className?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ 
  children, 
  theme = "dark",
  className = "" 
}) => {
  return (
    <div
      dir="ltr"
      className={`relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans ${className}`}
      style={{ direction: "ltr", textAlign: "left" }}
    >
      <TopBarControls theme={theme} />
      {children}
    </div>
  );
};
