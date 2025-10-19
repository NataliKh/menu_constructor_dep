import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Input, Section, SectionTitle, Toolbar, IconButton } from "../../shared/ui/base";
import styles from "./Menus.module.css";
import { api } from "../../shared/api/client";
import { useLoading } from "../../shared/loading/LoadingProvider";
import { ToastContainerContext } from "../../shared/ui/ToastContainer";
import { useMenusServer } from "../../features/menus/useMenusServer";
import { RefreshIcon } from "../../shared/ui/icons/RefreshIcon";
import { ExportIcon } from "../../shared/ui/icons/ExportIcon";
import { TrashIcon } from "../../shared/ui/icons/TrashIcon";

interface SavedMenu { id: string; name: string; items: any[] }

const MenusListPage: React.FC = () => {
  const [menus, setMenus] = React.useState<SavedMenu[]>([]);
  const [name, setName] = React.useState("");
  const navigate = useNavigate();
  const { withLoading } = useLoading();
  const toast = React.useContext(ToastContainerContext);
  const { fetchAll, deleteOne } = useMenusServer();

  const load = React.useCallback(async () => {
    const data = await fetchAll();
    if (Array.isArray(data)) setMenus(data);
  }, [fetchAll]);

  React.useEffect(() => { load(); }, [load]);

  const handleCreateOnServer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const menuName = name.trim() || "Без названия";
    await withLoading(async () => {
      try {
        const created = await api.post<{ id: string; name: string }>(`/api/menus`, { name: menuName });
        setName("");
        navigate(`/menus/${created.id}/edit`);
      } catch {
        toast?.notify("Не удалось создать меню", "error", 3500);
      }
    });
  };

  return (
    <Section>
      <SectionTitle level={1}>Меню</SectionTitle>
      <Toolbar>
        <form onSubmit={handleCreateOnServer} style={{ display: "flex", gap: 8 }}>
          <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Название меню" style={{ minWidth: 260 }} name="name" />
          <Button type="submit">Создать</Button>
        </form>
      </Toolbar>
      <Toolbar className={styles._mt12}>
        <IconButton title="Обновить" aria-label="Обновить" onClick={async () => { await load(); toast?.notify("Обновлено", "success", 2000); }}>
          <RefreshIcon />
        </IconButton>
      </Toolbar>
      <ul className={styles._list}>
        {menus.map((m) => (
          <li key={m.id} className={styles._item}>
            <Link to={`/menus/${m.id}/edit`} className={styles._link}>{m.name}</Link>
            <IconButton title="Экспорт" aria-label="Экспорт" onClick={() => navigate(`/menus/${m.id}/export`)}>
              <ExportIcon />
            </IconButton>
            <IconButton danger title="Удалить" aria-label="Удалить" onClick={async () => { try { await deleteOne(m.id); await load(); } finally {} }}>
              <TrashIcon />
            </IconButton>
          </li>
        ))}
      </ul>
    </Section>
  );
};

export default MenusListPage;
