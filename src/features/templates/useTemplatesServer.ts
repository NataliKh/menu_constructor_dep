import React from "react";
import { useAsyncAction } from "../../shared/hooks/useAsyncAction";
import { api } from "../../shared/api/client";
import type { ApiError } from "../../shared/api/client";

type TemplatePayload = { name: string; value: string };

const RETRY_DELAY = 250;

async function retry<T>(fn: () => Promise<T>, retries = 1, label = "templates") {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (error) {
      const status = (error as ApiError)?.status;
      const shouldRetry = attempt < retries && (!status || status >= 500);
      console.error(`[${label}] request failed (attempt ${attempt + 1})`, error);
      if (!shouldRetry) throw error;
      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * attempt));
    }
  }
}

export function useTemplatesServer() {
  const run = useAsyncAction();

  const uploadAll = React.useCallback(async (templates: TemplatePayload[]) =>
    run(async () => retry(() => api.post("/api/templates/bulk", { templates }), 1, "templates/bulk"), {
      error: "Не удалось сохранить шаблоны",
    })
  , [run]);

  const fetchAll = React.useCallback(async () =>
    run(async () => retry(() => api.get<TemplatePayload[]>("/api/templates"), 2, "templates/get"), {
      error: "Не удалось получить шаблоны",
    })
  , [run]);

  const deleteOne = React.useCallback(async (name: string) =>
    run(async () => retry(() => api.del(`/api/templates/${encodeURIComponent(name)}`), 1, "templates/delete"), {
      success: "Шаблон удалён",
      error: "Не удалось удалить шаблон",
    })
  , [run]);

  return { uploadAll, fetchAll, deleteOne } as const;
}
