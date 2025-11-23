import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Input, Section, SectionTitle, Toolbar, IconButton } from "../../shared/ui/base";
import styles from "./Menus.module.css";
import { useLoading } from "../../shared/loading/LoadingProvider";
import { ToastContainerContext } from "../../shared/ui/ToastContainer";
import { RefreshIcon } from "../../shared/ui/icons/RefreshIcon";
import { ExportIcon } from "../../shared/ui/icons/ExportIcon";
import { TrashIcon } from "../../shared/ui/icons/TrashIcon";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { createMenu, deleteMenu, fetchMenus } from "../../features/menus/store/menusSlice";

interface SavedMenu { id: string; name: string; items: any[] }

const MenusListPage: React.FC = () => {
  const [name, setName] = React.useState("");
  const dispatch = useAppDispatch();
  const menus = useAppSelector((state) => state.menus.items as SavedMenu[]);
  const navigate = useNavigate();
  const { withLoading } = useLoading();
  const toast = React.useContext(ToastContainerContext);

  const load = React.useCallback(async () => {
    await withLoading(async () => {
      try {
        await dispatch(fetchMenus()).unwrap();
      } catch {
        toast?.notify("Не удалось получить список меню", "error", 3500);
      }
    });
  }, [dispatch, toast, withLoading]);

  React.useEffect(() => { load(); }, [load]);

  const handleCreateOnServer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await withLoading(async () => {
      try {
        const created = await dispatch(createMenu(name)).unwrap();
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
            <IconButton
              danger
              title="Удалить"
              aria-label="Удалить"
              onClick={async () => {
                await withLoading(async () => {
                  try {
                    await dispatch(deleteMenu(m.id)).unwrap();
                  } catch {
                    toast?.notify("Не удалось удалить меню", "error", 3500);
                  }
                });
              }}
            >
              <TrashIcon />
            </IconButton>
          </li>
        ))}
      </ul>
    </Section>
  );
};

export default MenusListPage;
