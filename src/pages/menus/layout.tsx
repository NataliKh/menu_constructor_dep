import React from "react";
import { Link, NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { api } from "../../shared/api/client";

const activeStyle: React.CSSProperties = { fontWeight: 600, textDecoration: "underline" };

const MenuLayout: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [menuName, setMenuName] = React.useState<string>("");
  const [exists, setExists] = React.useState<boolean>(false);

  React.useEffect(() => {
    let alive = true;
    async function load() {
      try {
        if (!id) return;
        const data = await api.get<{ id: string; name: string }>(`/api/menus/${id}`);
        if (!alive) return;
        setMenuName(data.name);
        setExists(true);
      } catch {
        navigate('/menus', { replace: true });
      }
    }
    load();
    return () => { alive = false; };
  }, [id, navigate]);

  if (!exists) return null;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 8 }}>
        <Link to="/menus">← К списку меню</Link>
      </div>
      <h2 style={{ marginTop: 0 }}>{menuName}</h2>
      <div style={{ display: "flex", gap: 12, borderBottom: "1px solid #eee", paddingBottom: 8, marginBottom: 16 }}>
        <NavLink to="edit" style={({ isActive }) => (isActive ? activeStyle : undefined)}>Редактор</NavLink>
        <NavLink to="export" style={({ isActive }) => (isActive ? activeStyle : undefined)}>Экспорт</NavLink>
        <NavLink to="preview" style={({ isActive }) => (isActive ? activeStyle : undefined)}>Предпросмотр</NavLink>
      </div>
      <Outlet />
    </div>
  );
};

export default MenuLayout;
