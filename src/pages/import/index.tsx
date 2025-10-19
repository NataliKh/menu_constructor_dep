import React from "react";
import { useNavigate } from "react-router-dom";
import { GoogleSheetsImport } from "../../features/google-sheets-import/GoogleSheetsImport";
import { api } from "../../shared/api/client";
import { useAsyncAction } from "../../shared/hooks/useAsyncAction";
import { Section, SectionTitle } from "../../shared/ui/base";
import type { MenuItem } from "../../entities/menu";

const ImportPage: React.FC = () => {
  const navigate = useNavigate();
  const run = useAsyncAction();

  const handleImport = async (items: MenuItem[], name?: string) => {
    const created = await run(async () => {
      return api.post<{ id: string; name: string }>("/api/menus", { name: name ?? "Импортированное меню", items });
    }, { success: "Меню импортировано и сохранено" });
    navigate(`/menus/${created.id}/edit`);
  };

  return (
    <Section>
      <SectionTitle level={1}>Импорт меню</SectionTitle>
      <GoogleSheetsImport onImport={handleImport} />
    </Section>
  );
};

export default ImportPage;
