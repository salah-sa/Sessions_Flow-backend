import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { Toaster } from "sonner";
import App from "./App";
import "./index.css";
import "./lib/i18n";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes fresh — reduced from 5 to improve freshness
      gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
      refetchOnWindowFocus: true, // Refetch stale data when user returns to tab
      refetchOnMount: true, // Refetch stale data when component mounts (navigation)
      refetchOnReconnect: true, // Refetch on network reconnect
      retry: 1,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "sf_query_cache",
});

const persistOptions = {
  persister,
  buster: "v3-fix-key-collision",
  dehydrateOptions: {
    shouldDehydrateQuery: (query: any) => {
      // Never persist chat messages — they use useInfiniteQuery
      // and must always be fetched fresh from the server.
      const key = query.queryKey;
      if (Array.isArray(key) && key[0] === "chat" && key[1] === "messages") {
        return false;
      }
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
      <Toaster position="bottom-right" richColors closeButton />
    </PersistQueryClientProvider>
  </React.StrictMode>
);

// Success log for host
const win = window as any;
if (win.chrome && win.chrome.webview) {
  win.chrome.webview.postMessage("React Mounted Successfully");
}
