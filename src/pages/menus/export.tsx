import React from "react";
import { useParams } from "react-router-dom";
import { api } from "../../shared/api/client";
import type { MenuItem } from "../../entities/menu";
import { useTemplatesServer } from "../../features/templates/useTemplatesServer";
import { Button, Select, TextArea, Section, SectionTitle } from "../../shared/ui/base";
import styles from "./Export.module.css";

const DEFAULT_TEMPLATE = `<li class="<?= htmlspecialchars($item['className'] ?? '') ?>">
  <a href="<?= htmlspecialchars($item['uri'] ?? '#') ?>">
    <?= htmlspecialchars($item['text'] ?? '') ?>
  </a>
  <?php if (!empty($item['children'])): ?>
    <ul>
      <?= renderMenu($item['children']); ?>
    </ul>
  <?php endif; ?>
</li>`;

type Template = { name: string; value: string };
type LoadedMenu = { id: string; name: string; items: MenuItem[] };

function normalizeTemplates(list?: Template[] | null): Template[] {
  if (!Array.isArray(list) || list.length === 0) {
    return [{ name: "default", value: DEFAULT_TEMPLATE }];
  }
  const withDefault = list.map((tpl) =>
    tpl.name === "default" && !tpl.value.trim() ? { ...tpl, value: DEFAULT_TEMPLATE } : tpl
  );
  if (withDefault.some((tpl) => tpl.name === "default")) {
    return withDefault;
  }
  return [{ name: "default", value: DEFAULT_TEMPLATE }, ...withDefault];
}

function removeEmptyChildren(items: MenuItem[]): MenuItem[] {
  return items.map((item) => {
    const next: MenuItem = { ...item };
    if (next.children) {
      next.children = removeEmptyChildren(next.children);
      if (!next.children.length) delete next.children;
    }
    return next;
  });
}

function exportJSON(menu: MenuItem[], name: string) {
  const cleanedMenu = removeEmptyChildren(menu);
  const data = JSON.stringify(cleanedMenu, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name || "menu"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

const MenuExportPage: React.FC = () => {
  const { id } = useParams();
  const { fetchAll } = useTemplatesServer();

  const [menu, setMenu] = React.useState<LoadedMenu | null>(null);
  const [templates, setTemplates] = React.useState<Template[]>(normalizeTemplates([]));
  const [selectedTemplate, setSelectedTemplate] = React.useState<string>("default");
  const [phpPreview, setPhpPreview] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      const data = await api.get<LoadedMenu>(`/api/menus/${id}`);
      if (!cancelled) setMenu(data);
    })();
    return () => { cancelled = true; };
  }, [id]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const remote = await fetchAll();
      if (cancelled) return;
      const normalized = normalizeTemplates(remote);
      setTemplates(normalized);
      setSelectedTemplate((prev) =>
        normalized.some((tpl) => tpl.name === prev) ? prev : normalized[0]?.name ?? "default"
      );
    })();
    return () => { cancelled = true; };
  }, [fetchAll]);

  if (!menu) return null;

  const handleGeneratePHP = () => {
    const template = templates.find((tpl) => tpl.name === selectedTemplate)?.value ?? DEFAULT_TEMPLATE;
    const functionBody = `function renderMenu($items) {\n    \$out = '';\n    foreach ($items as $item) {\n        \$out .= <<<HTML\n" . renderMenuItem($item) . "\nHTML;\n    }\n    return \$out;\n}\n\nfunction renderMenuItem($item) {\n    \$out = '';\n    // --- customize markup here ---\n    \$out .= <<<HTML\n${template}\nHTML;\n    return \$out;\n}`;
    const example = `// Example usage:\necho '<ul>' . renderMenu($menuArray) . '</ul>';`;
    setPhpPreview(`<?php\n// Generated PHP helpers for menu export\n${functionBody}\n\n${example}\n?>`);
  };

  const handleDownloadPHP = () => {
    const blob = new Blob([phpPreview], { type: "text/x-php" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${menu.name || "menu"}.php`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Section>
      <SectionTitle level={1}>Menu Export</SectionTitle>
      <div className={styles._row}>
        <Button onClick={() => exportJSON(menu.items, menu.name)}>Скачать JSON</Button>
        <Button onClick={handleGeneratePHP}>Сгенерировать PHP</Button>
      </div>

      <div>
        <div className={styles._label}>Шаблон PHP:</div>
        <div className={styles._selectRow}>
          <Select value={selectedTemplate} onChange={(event) => setSelectedTemplate(event.target.value)}>
            {templates.map((tpl) => (
              <option key={tpl.name} value={tpl.name}>
                {tpl.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {phpPreview && (
        <div>
          <div className={styles._row} style={{ justifyContent: "space-between" }}>
            <span>PHP предпросмотр:</span>
            <Button onClick={handleDownloadPHP}>Скачать PHP</Button>
          </div>
          <TextArea readOnly rows={10} value={phpPreview} />
        </div>
      )}
    </Section>
  );
};

export default MenuExportPage;