import React from "react";
import { Button, Select, TextArea, Section, SectionTitle, Input, Modal } from "../../shared/ui/base";
import styles from "./Templates.module.css";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  DEFAULT_TEMPLATE,
  deleteTemplateLocal,
  deleteTemplateRemote,
  fetchTemplates,
  markSynced,
  normalizeTemplates,
  renameTemplateLocal,
  setSyncDisabled,
  setTemplateValue,
  upsertTemplate,
  uploadTemplates,
} from "../../features/templates/store/templatesSlice";
import type { Template } from "../../features/templates/store/templatesSlice";
import { ToastContainerContext } from "../../shared/ui/ToastContainer";
import type { ApiError } from "../../shared/api/client";
import { useLoading } from "../../shared/loading/LoadingProvider";

type DialogState =
  | { type: "save"; initialName: string }
  | { type: "rename"; initialName: string }
  | { type: "delete"; name: string };

const TemplatesPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const templates = useAppSelector((state) => state.templates.items as Template[]);
  const hasLocalChanges = useAppSelector((state) => state.templates.hasLocalChanges);
  const syncDisabled = useAppSelector((state) => state.templates.syncDisabled);
  const status = useAppSelector((state) => state.templates.status);
  const [selected, setSelected] = React.useState<string>("default");
  const [dialog, setDialog] = React.useState<DialogState | null>(null);
  const [dialogName, setDialogName] = React.useState("");
  const [dialogError, setDialogError] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const toast = React.useContext(ToastContainerContext);
  const { withLoading } = useLoading();

  const isLoading = status === "loading";
  const selectedTemplate = templates.find((tpl) => tpl.name === selected);
  const value = selectedTemplate?.value ?? DEFAULT_TEMPLATE;

  const ensureSelection = React.useCallback(() => {
    if (!templates.length) return;
    setSelected((prev) => {
      if (templates.some((tpl) => tpl.name === prev)) return prev;
      const fallback = templates.find((tpl) => tpl.name === "default")?.name ?? templates[0]?.name ?? "default";
      return fallback;
    });
  }, [templates]);

  React.useEffect(() => {
    ensureSelection();
  }, [ensureSelection]);

  const handleFetchFromServer = React.useCallback(async () => {
    await withLoading(async () => {
      try {
        await dispatch(fetchTemplates()).unwrap();
        dispatch(setSyncDisabled(false));
      } catch (error) {
        const statusCode = (error as ApiError)?.status;
        if (statusCode === 401 || statusCode === 403) {
          dispatch(setSyncDisabled(true));
        }
        toast?.notify("Не удалось загрузить шаблоны", "error", 3500);
      }
    });
  }, [dispatch, toast, withLoading]);

  React.useEffect(() => {
    void handleFetchFromServer();
  }, [handleFetchFromServer]);

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
    let cancelled = false;
    setIsProcessing(true);

    (async () => {
      try {
        await withLoading(async () => {
          await dispatch(uploadTemplates(templates)).unwrap();
        });
        if (!cancelled) dispatch(markSynced());
      } catch (error) {
        const statusCode = (error as ApiError)?.status;
        if (statusCode === 401 || statusCode === 403) {
          dispatch(setSyncDisabled(true));
        } else {
          toast?.notify("Не удалось синхронизировать шаблоны", "error", 3500);
        }
      } finally {
        if (!cancelled) setIsProcessing(false);
      }
    })();

    return () => { cancelled = true; };
  }, [templates, hasLocalChanges, syncDisabled, isProcessing, dispatch, withLoading, toast]);

  const handleValueChange = (next: string) => {
    if (!selected) return;
    dispatch(setTemplateValue({ name: selected, value: next }));
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
      setDialogError("Название шаблона обязательно");
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
    dispatch(upsertTemplate({ name: trimmed, value }));
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
    dispatch(renameTemplateLocal({ from: original, to: trimmed }));
    setSelected(trimmed);
    closeDialog();
  };

  const handleConfirmDelete = async () => {
    if (!dialog || dialog.type !== "delete") return;
    const target = dialog.name;
    setIsProcessing(true);
    await withLoading(async () => {
      let removed = false;
      try {
        await dispatch(deleteTemplateRemote(target)).unwrap();
        removed = true;
      } catch (error) {
        const statusCode = (error as ApiError)?.status;
        if (statusCode === 401 || statusCode === 403) {
          dispatch(setSyncDisabled(true));
          dispatch(deleteTemplateLocal(target));
          removed = true;
        } else {
          toast?.notify("Не удалось удалить шаблон", "error", 3500);
        }
      } finally {
        if (removed) {
          const normalized = normalizeTemplates(templates.filter((tpl) => tpl.name !== target));
          const fallbackName = normalized.find((tpl) => tpl.name === "default")?.name ?? normalized[0]?.name ?? "default";
          setSelected((prevSelected) => (prevSelected === target ? fallbackName : prevSelected));
        }
        setDialog(null);
        setIsProcessing(false);
      }
    });
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

  const syncHint = syncDisabled
    ? "Автосинхронизация отключена (нет доступа). Можно продолжать правки локально и повторить попытку позже."
    : hasLocalChanges
      ? "Есть несохраненные изменения, отправим их на сервер автоматически."
      : "Локальные данные синхронизированы с сервером.";

  return (
    <Section>
      <SectionTitle level={1}>Шаблоны меню (PHP)</SectionTitle>
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
        <span className={styles._hint}>{syncHint}</span>
        <Button type="button" onClick={handleFetchFromServer} variant="secondary" disabled={isLoading || isProcessing}>
          Обновить с сервера
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
          <p>Шаблон «{dialog.name}» будет удален. Сохранить изменения нельзя отменить.</p>
        </Modal>
      )}
    </Section>
  );
};

export default TemplatesPage;
