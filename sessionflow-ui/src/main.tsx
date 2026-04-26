import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { Toaster } from "sonner";
import App from "./App";
import "./index.css";
import "./lib/i18n";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes fresh
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection (was 30 — reduced to cut memory bloat)
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "sf_query_cache",
});

// Volatile/large queries that should NEVER be persisted to localStorage
const VOLATILE_QUERY_PREFIXES = ["chat", "sessions", "students", "timetable", "student-locations"];

const persistOptions = {
  persister,
  maxAge: 10 * 60 * 1000, // Max 10 minutes of cached data persisted
  buster: "v4-perf-fix",
  dehydrateOptions: {
    shouldDehydrateQuery: (query: any) => {
      const key = query.queryKey;
      if (!Array.isArray(key)) return false;

      // Exclude volatile/large queries from persistence entirely
      if (VOLATILE_QUERY_PREFIXES.includes(key[0])) return false;

      return query.state.status === "success";
    },
  },
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
    >
      <App />
      <Toaster 
        position="bottom-right" 
        richColors 
        closeButton 
        theme="dark"
        toastOptions={{
          style: {
            background: 'var(--ui-sidebar-bg)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
          },
          className: "zenith-toast"
        }}
      />
    </PersistQueryClientProvider>
  </React.StrictMode>
);

// Success log for host
const win = window as any;
if (win.chrome && win.chrome.webview) {
  win.chrome.webview.postMessage("React Mounted Successfully");
}
