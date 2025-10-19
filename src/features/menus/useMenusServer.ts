import React from "react";
import { api } from "../../shared/api/client";
import { useAsyncAction } from "../../shared/hooks/useAsyncAction";

interface SavedMenu { id: string; name: string; items: any[] }

export function useMenusServer() {
  const run = useAsyncAction();

  const fetchAll = React.useCallback(async () =>
    run(async () => {
      return api.get<SavedMenu[]>("/api/menus");
    }, { error: "Не удалось загрузить список меню" })
  , [run]);

  const deleteOne = React.useCallback(async (id: string) =>
    run(async () => {
      await api.del(`/api/menus/${id}`);
    }, { success: "Меню удалено", error: "Не удалось удалить меню" })
  , [run]);

  return { fetchAll, deleteOne } as const;
}
