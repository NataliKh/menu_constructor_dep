import React from "react";
import { useLoading } from "../loading/LoadingProvider";
import { ToastContainerContext } from "../ui/ToastContainer";

interface Options {
  success?: string;
  error?: string;
  duration?: number;
}

export function useAsyncAction() {
  const { withLoading } = useLoading();
  const toast = React.useContext(ToastContainerContext);

  return React.useCallback(async <T,>(fn: () => Promise<T>, opts?: Options) => {
    return withLoading(async () => {
      try {
        const res = await fn();
        if (opts?.success) toast?.notify(opts.success, "success", opts.duration ?? 2000);
        return res;
      } catch (e) {
        if (opts?.error) toast?.notify(opts.error, "error", opts.duration ?? 3500);
        throw e;
      }
    });
  }, [withLoading, toast]);
}
