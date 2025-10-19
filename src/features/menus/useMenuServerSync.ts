import React from "react";
import type { MenuItem } from "../../entities/menu";
import { api } from "../../shared/api/client";
import { useAsyncAction } from "../../shared/hooks/useAsyncAction";

export interface MenuPayload {
  id: string;
  name: string;
  items: MenuItem[];
}

export function useMenuServerSync(menuId: string, name: string, items: MenuItem[]) {
  const run = useAsyncAction();
  const [preview, setPreview] = React.useState("");

  const submit = React.useCallback(async () => {
    const payload: MenuPayload = { id: menuId, name, items };
    setPreview(JSON.stringify(payload, null, 2));
    await run(
      async () => {
        await api.put(`/api/menus/${menuId}`, payload);
      },
      { success: "Меню сохранено на сервере", error: "Не удалось сохранить меню" }
    );
  }, [menuId, name, items, run]);

  return { submit, preview } as const;
}

