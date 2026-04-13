import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Global keyboard shortcuts for the app.
 * Ctrl+D → Dashboard
 * Ctrl+G → Groups
 * Ctrl+S → Sessions List
 * Ctrl+H → History
 * Escape → Close modals (handled by Radix)
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
      if (!e.ctrlKey && !e.metaKey) return;

      switch (e.key.toLowerCase()) {
        case "d":
          e.preventDefault();
          navigate("/");
          break;
        case "g":
          e.preventDefault();
          navigate("/groups");
          break;
        case "j": // J for sessions (S is browser save)
          e.preventDefault();
          navigate("/sessions");
          break;
        case "h":
          e.preventDefault();
          navigate("/history");
          break;
        case "t":
          e.preventDefault();
          navigate("/timetable");
          break;
        case "k": // K for chat
          e.preventDefault();
          navigate("/chat");
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);
}
