import React from "react";

interface LoadingContextValue {
  isLoading: boolean;
  start: () => void;
  stop: () => void;
  withLoading: <T>(fn: () => Promise<T> | T) => Promise<T>;
}

const LoadingContext = React.createContext<LoadingContextValue | null>(null);

export const LoadingProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [counter, setCounter] = React.useState(0);

  const start = React.useCallback(() => setCounter((c) => c + 1), []);
  const stop = React.useCallback(() => setCounter((c) => Math.max(0, c - 1)), []);

  const withLoading = React.useCallback(async <T,>(fn: () => Promise<T> | T) => {
    start();
    try {
      return await Promise.resolve(fn());
    } finally {
      stop();
    }
  }, [start, stop]);

  const value = React.useMemo<LoadingContextValue>(() => ({
    isLoading: counter > 0,
    start,
    stop,
    withLoading,
  }), [counter, start, stop, withLoading]);

  return (
    <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
  );
};

export function useLoading() {
  const ctx = React.useContext(LoadingContext);
  if (!ctx) throw new Error("useLoading must be used within LoadingProvider");
  return ctx;
}

