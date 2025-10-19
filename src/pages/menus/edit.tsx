import React from "react";
import { useParams } from "react-router-dom";
import { api } from "../../shared/api/client";
import { MenuEditor } from "../../widgets/menu-editor/MenuEditor";
import { Input, Button, TextArea, Section, SectionTitle } from "../../shared/ui/base";
import styles from "./Edit.module.css";
import { useMenuServerSync } from "../../features/menus/useMenuServerSync";

const MenuEditPage: React.FC = () => {
  const { id } = useParams();
  const [name, setNameInput] = React.useState("");
  const [items, setItems] = React.useState<any[]>([]);
  const { submit, preview } = useMenuServerSync(id || "", name.trim(), items);

  React.useEffect(() => {
    let alive = true;
    async function load() {
      if (!id) return;
      const data = await api.get<{ id: string; name: string; items: any[] }>(`/api/menus/${id}`);
      if (!alive) return;
      setNameInput(data.name);
      setItems(data.items);
    }
    load();
    return () => { alive = false; };
  }, [id]);

  if (!id) return null;

  return (
    <Section>
      <SectionTitle level={1}>Редактор меню</SectionTitle>
      <div className={styles._fieldRow}>
        <Input value={name} placeholder="Название меню" onChange={(e) => setNameInput(e.target.value)} style={{ minWidth: 280 }} />
      </div>
      <MenuEditor value={items} onChange={(v) => setItems(v)} />
      <div className={styles._saveBlock}>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className={styles._fieldRow}>
          <Button type="submit">Сохранить</Button>
        </form>
        {preview && (
          <div>
            <div className={styles._previewLabel}>Предпросмотр JSON-запроса:</div>
            <TextArea readOnly rows={8} value={preview} />
          </div>
        )}
      </div>
    </Section>
  );
};

export default MenuEditPage;
