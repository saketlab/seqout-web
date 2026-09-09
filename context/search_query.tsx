"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

// Retain the submitted query in memory across client-side navigation.
// A full reload clears it so fresh visits start with an empty search.
let currentQuery = "";

function readQuery(): string {
  return currentQuery;
}

function writeQuery(q: string): void {
  currentQuery = q;
}

// Multiple components subscribe in the same tab (the results page sets the query,
// the header bar reads it); a small pub/sub keeps every subscriber in sync.
const listeners = new Set<() => void>();
function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
function notifyListeners() {
  listeners.forEach((l) => l());
}

function getServerSnapshot(): string {
  return "";
}

type SearchQueryContextValue = {
  lastSearchQuery: string;
  setLastSearchQuery: (q: string) => void;
};

const SearchQueryContext = createContext<SearchQueryContextValue>({
  lastSearchQuery: "",
  setLastSearchQuery: () => {},
});

export function SearchQueryProvider({ children }: { children: ReactNode }) {
  const lastSearchQuery = useSyncExternalStore(
    subscribe,
    readQuery,
    getServerSnapshot,
  );

  const setLastSearchQuery = useCallback((q: string) => {
    writeQuery(q);
    notifyListeners();
  }, []);

  const value = useMemo<SearchQueryContextValue>(
    () => ({ lastSearchQuery, setLastSearchQuery }),
    [lastSearchQuery, setLastSearchQuery],
  );

  return (
    <SearchQueryContext.Provider value={value}>
      {children}
    </SearchQueryContext.Provider>
  );
}

export function useSearchQuery() {
  return useContext(SearchQueryContext);
}
