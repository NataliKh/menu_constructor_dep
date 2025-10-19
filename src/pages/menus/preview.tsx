import React from "react";
import { useParams } from "react-router-dom";
import { api } from "../../shared/api/client";
import { MenuPreview } from "../../widgets/menu-preview/MenuPreview";

const MenuPreviewPage: React.FC = () => {
  const { id } = useParams();
  const [items, setItems] = React.useState<any[]>([]);
  React.useEffect(() => {
    let alive = true;
    async function load() {
      if (!id) return;
      const data = await api.get<{ id: string; name: string; items: any[] }>(`/api/menus/${id}`);
      if (!alive) return;
      setItems(data.items);
    }
    load();
    return () => { alive = false; };
  }, [id]);
  return (
    <div>
      <MenuPreview items={items} />
    </div>
  );
};

export default MenuPreviewPage;
