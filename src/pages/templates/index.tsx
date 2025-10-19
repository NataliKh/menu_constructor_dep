import React from "react";
import { Button, Select, TextArea, Section, SectionTitle, Input, Modal } from "../../shared/ui/base";
import styles from "./Templates.module.css";
import { useTemplatesServer } from "../../features/templates/useTemplatesServer";
import type { ApiError } from "../../shared/api/client";

type Template = { name: string; value: string };

type DialogState =
  | { type: "save"; initialName: string }
  | { type: "rename"; initialName: string }
  | { type: "delete"; name: string };

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

function normalizeTemplates(list: Template[]): Template[] {
  const seen = new Set<string>();
  let defaultTemplate: Template | null = null;
  const others: Template[] = [];

  list.forEach((item) => {
    if (!item) return;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!name || seen.has(name)) return;
    seen.add(name);
    const value = typeof item.value === "string" ? item.value.trimEnd() : "";
    if (name === "default") {
      defaultTemplate = { name: "default", value: value || DEFAULT_TEMPLATE };
    } else {
      others.push({ name, value: value || DEFAULT_TEMPLATE });
    }
  });

  return defaultTemplate
    ? [defaultTemplate, ...others]
    : [{ name: "default", value: DEFAULT_TEMPLATE }, ...others];
}

function templatesEqual(a: Template[], b: Template[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].name !== b[i].name) return false;
    const left = (a[i].value || "").trimEnd();
    const right = (b[i].value || "").trimEnd();
    if (left !== right) return false;
  }
  return true;
}

const TemplatesPage: React.FC = () => {
  const { uploadAll, fetchAll, deleteOne } = useTemplatesServer();
  const [templates, setTemplates] = React.useState<Template[]>([{ name: "default", value: DEFAULT_TEMPLATE }]);
  const [selected, setSelected] = React.useState<string>("default");
  const [value, setValue] = React.useState(DEFAULT_TEMPLATE);
  const [isLoading, setIsLoading] = React.useState(true);
  const [syncDisabled, setSyncDisabled] = React.useState(true);
  const [hasLocalChanges, setHasLocalChanges] = React.useState(false);
  const [dialog, setDialog] = React.useState<DialogState | null>(null);
  const [dialogName, setDialogName] = React.useState("");
  const [dialogError, setDialogError] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);

  const attemptSync = React.useCallback(async (payload: Template[]) => {
    if (syncDisabled) return;
    try {
      await uploadAll(payload);
      setHasLocalChanges(false);
    } catch (error) {
      const status = (error as ApiError)?.status;
      if (status === 401 || status === 403) {
        setSyncDisabled(true);
      }
      throw error;
    }
  }, [uploadAll, syncDisabled]);

  React.useEffect(() => {
    const current = templates.find((tpl) => tpl.name === selected);
    setValue(current?.value ?? DEFAULT_TEMPLATE);
  }, [templates, selected]);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const remote = await fetchAll();
        if (cancelled) return;
        const rawList = Array.isArray(remote) ? (remote as Template[]) : [];
        const normalized = normalizeTemplates(rawList);
        setTemplates(normalized);
        setSelected(normalized.some((tpl) => tpl.name === "default") ? "default" : normalized[0]?.name ?? "default");
        setSyncDisabled(false);
        setHasLocalChanges(false);
      } catch (error) {
        const status = (error as ApiError)?.status;
        if (!cancelled && (status === 401 || status === 403)) {
          setSyncDisabled(true);
        }
        if (!cancelled) {
          setTemplates([{ name: "default", value: DEFAULT_TEMPLATE }]);
          setSelected("default");
          setHasLocalChanges(false);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchAll]);

  React.useEffect(() => {
    if (!dialog) {
      setDialogName("");
      setDialogError("");
      return;
    }
    if (dialog.type === "save" || dialog.type === "rename") {
      setDialogName(dialog.initialName);
      setDialogError("");
    }
  }, [dialog]);

  React.useEffect(() => {
    if (!hasLocalChanges || syncDisabled || isProcessing) return;
    void attemptSync(templates).catch(() => {});
  }, [templates, hasLocalChanges, syncDisabled, isProcessing, attemptSync]);

  const handleValueChange = (next: string) => {
    setValue(next);
    setTemplates((prev) => {
      const mapped = prev.map((tpl) => (tpl.name === selected ? { ...tpl, value: next } : tpl));
      const normalized = normalizeTemplates(mapped);
      if (templatesEqual(prev, normalized)) return prev;
      setHasLocalChanges(true);
      return normalized;
    });
  };

  const openSave = () => {
    const initial = selected === "default" ? "custom" : selected;
    setDialog({ type: "save", initialName: initial });
  };

  const openRename = () => {
    if (selected === "default") return;
    setDialog({ type: "rename", initialName: selected });
  };

  const openDelete = () => {
    if (selected === "default") return;
    setDialog({ type: "delete", name: selected });
  };

  const closeDialog = () => {
    if (isProcessing) return;
    setDialog(null);
    setDialogError("");
  };

  const ensureName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      setDialogError("Введите название шаблона");
      return null;
    }
    return trimmed;
  };

  const handleSubmitSave = () => {
    if (!dialog || dialog.type !== "save") return;
    const trimmed = ensureName(dialogName);
    if (!trimmed) return;
    if (templates.some((tpl) => tpl.name === trimmed) && trimmed !== selected) {
      setDialogError("Шаблон с таким именем уже существует");
      return;
    }
    setTemplates((prev) => {
      const idx = prev.findIndex((tpl) => tpl.name === trimmed);
      const nextList = idx === -1
        ? [...prev, { name: trimmed, value }]
        : prev.map((tpl) => (tpl.name === trimmed ? { name: trimmed, value } : tpl));
      const normalized = normalizeTemplates(nextList);
      if (templatesEqual(prev, normalized)) {
        return prev;
      }
      setHasLocalChanges(true);
      return normalized;
    });
    setSelected(trimmed);
    closeDialog();
  };

  const handleSubmitRename = () => {
    if (!dialog || dialog.type !== "rename") return;
    const trimmed = ensureName(dialogName);
    if (!trimmed) return;
    if (trimmed === selected) {
      closeDialog();
      return;
    }
    if (templates.some((tpl) => tpl.name === trimmed)) {
      setDialogError("Шаблон с таким именем уже существует");
      return;
    }
    const original = selected;
    setTemplates((prev) => {
      const nextList = prev.map((tpl) => (tpl.name === original ? { ...tpl, name: trimmed } : tpl));
      const normalized = normalizeTemplates(nextList);
      if (templatesEqual(prev, normalized)) {
        return prev;
      }
      setHasLocalChanges(true);
      return normalized;
    });
    setSelected(trimmed);
    closeDialog();
  };

  const handleConfirmDelete = async () => {
    if (!dialog || dialog.type !== "delete") return;
    const target = dialog.name;
    setIsProcessing(true);
    let skipSync = false;
    try {
      await deleteOne(target);
    } catch (error) {
      const status = (error as ApiError)?.status;
      if (status === 401 || status === 403) {
        setSyncDisabled(true);
        skipSync = true;
      }
    } finally {
      let fallbackName: string | null = null;
      setTemplates((prev) => {
        const filtered = prev.filter((tpl) => tpl.name !== target);
        const normalized = normalizeTemplates(filtered);
        fallbackName = normalized.some((tpl) => tpl.name === "default")
          ? "default"
          : normalized[0]?.name ?? "default";
        if (templatesEqual(prev, normalized)) {
          return prev;
        }
        setHasLocalChanges(true);
        return normalized;
      });
      if (fallbackName) {
        setSelected((prevSelected) => (prevSelected === target ? fallbackName! : prevSelected));
      }
      setIsProcessing(false);
      setDialog(null);
    }
  };

  const handleFetchFromServer = async () => {
    setIsLoading(true);
    try {
      const remote = await fetchAll();
      const rawList = Array.isArray(remote) ? (remote as Template[]) : [];
      const normalized = normalizeTemplates(rawList);
      setTemplates(normalized);
      setSelected(normalized.some((tpl) => tpl.name === "default") ? "default" : normalized[0]?.name ?? "default");
      setSyncDisabled(false);
      setHasLocalChanges(false);
    } catch (error) {
      const status = (error as ApiError)?.status;
      if (status === 401 || status === 403) {
        setSyncDisabled(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderNameDialog = (title: string, onSubmit: () => void, submitLabel: string) => (
    <Modal
      title={title}
      onClose={closeDialog}
      footer={(
        <>
          <Button type="button" variant="secondary" onClick={closeDialog} disabled={isProcessing}>Отмена</Button>
          <Button type="button" onClick={onSubmit} disabled={isProcessing}>{submitLabel}</Button>
        </>
      )}
    >
      <div className={styles._modalField}>
        <label className={styles._fieldLabel} htmlFor="template-name">Название шаблона</label>
        <Input
          id="template-name"
          value={dialogName}
          onChange={(e) => setDialogName(e.target.value)}
          data-autofocus
          disabled={isProcessing}
        />
        {dialogError && <span className={styles._error}>{dialogError}</span>}
      </div>
    </Modal>
  );

  return (
    <Section>
      <SectionTitle level={1}>Шаблоны экспорта (PHP)</SectionTitle>
      <div className={styles._controls}>
        <Select value={selected} onChange={(e) => setSelected(e.target.value)} disabled={isLoading || isProcessing}>
          {templates.map((tpl) => (
            <option key={tpl.name} value={tpl.name}>
              {tpl.name}
            </option>
          ))}
        </Select>
        <Button onClick={openSave} disabled={isLoading || isProcessing}>Сохранить</Button>
        <Button onClick={openRename} disabled={isLoading || isProcessing || selected === "default"}>Переименовать</Button>
        <Button onClick={openDelete} disabled={isLoading || isProcessing || selected === "default"} variant="danger">Удалить</Button>
      </div>
      <TextArea value={value} onChange={(e) => handleValueChange(e.target.value)} rows={10} disabled={isLoading || isProcessing} />
      <div className={styles._footerRow}>
        <span className={styles._hint}>
          {syncDisabled
            ? "Нет доступа к серверу — шаблоны сохраняются только в этом браузере."
            : hasLocalChanges
              ? "Изменения ещё не отправлены на сервер."
              : "Изменения автоматически отправлены на сервер."}
        </span>
        <Button type="button" onClick={handleFetchFromServer} variant="secondary" disabled={isLoading || isProcessing}>
          Загрузить с сервера
        </Button>
      </div>
      {dialog?.type === "save" &&
        renderNameDialog("Сохранить шаблон", handleSubmitSave, "Сохранить")}

      {dialog?.type === "rename" &&
        renderNameDialog("Переименовать шаблон", handleSubmitRename, "Переименовать")}

      {dialog?.type === "delete" && (
        <Modal
          title="Удалить шаблон?"
          onClose={closeDialog}
          footer={(
            <>
              <Button type="button" variant="secondary" onClick={closeDialog} disabled={isProcessing}>Отмена</Button>
              <Button type="button" variant="danger" onClick={handleConfirmDelete} disabled={isProcessing}>Удалить</Button>
            </>
          )}
        >
          <p>Шаблон «{dialog.name}» будет удалён. Эта операция необратима.</p>
        </Modal>
      )}
    </Section>
  );
};

export default TemplatesPage;
