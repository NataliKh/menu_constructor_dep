import React, { useRef, useState } from "react";
import type { MenuItem } from "../../entities/menu";
import styles from "./GoogleSheetsImport.module.css";
import { useLoading } from "../../shared/loading/LoadingProvider";
import { ToastContainerContext } from "../../shared/ui/ToastContainer";

const menuPreviewSvg = "/menu-preview.svg";
const csvPreviewSvg = "/csv-preview.svg";
const googleSheetsPreviewSvg = "/google-sheets-preview.svg";

interface GoogleSheetsImportProps {
  onImport: (items: MenuItem[], name?: string) => void;
}

function assignUniqueIds(items: MenuItem[], prefix = ""): MenuItem[] {
  return items.map((item) => {
    const id = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      ...item,
      id,
      children: item.children ? assignUniqueIds(item.children, id + "-") : undefined,
    } as MenuItem;
  });
}

function smartSplit(line: string): string[] {
  const res: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === "," && !inQ) { res.push(cur.trim()); cur = ""; } else { cur += ch; }
  }
  res.push(cur.trim());
  return res;
}

function parseCsvToMenu(csv: string): MenuItem[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  const result: MenuItem[] = [];
  let lastParent: MenuItem | null = null;
  let lastChild: MenuItem | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#N/A")) continue;
    const cols = smartSplit(line).map((s) => s.replace(/^"|"$/g, "").trim());
    const [col1, col2, col3, col4, col5] = cols;

    // Родитель
    if (col1) {
      const parent: MenuItem = {
        id: `${i}-parent`,
        text: col1,
        uri: "",
        children: [],
      };
      result.push(parent);
      lastParent = parent;
      lastChild = null;

      if (col2 && col3 && lastParent) {
        const child: MenuItem = {
          id: `${i}-child`,
          text: col2,
          uri: col3,
          children: [],
        };
        lastParent.children!.push(child);
        lastChild = child;
      }
      if (col4 && col5 && lastChild) {
        const sub: MenuItem = {
          id: `${i}-subchild`,
          text: col4,
          uri: col5,
          children: [],
        };
        lastChild.children!.push(sub);
      }
      continue;
    }

    // Дочерние строки без нового родителя
    if (lastParent) {
      if (col2 && col3) {
        const child: MenuItem = {
          id: `${i}-child`,
          text: col2,
          uri: col3,
          children: [],
        };
        lastParent.children!.push(child);
        lastChild = child;
      }
      if (col4 && col5 && lastChild) {
        const sub: MenuItem = {
          id: `${i}-subchild`,
          text: col4,
          uri: col5,
          children: [],
        };
        lastChild.children!.push(sub);
      }
    }
  }
  return result;
}

function googleSheetsUrlToCsv(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("docs.google.com")) return null;
    const m = u.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
    const id = m?.[1];
    const gid = u.searchParams.get("gid") || "0";
    if (!id) return null;
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
  } catch { return null; }
}

export const GoogleSheetsImport: React.FC<GoogleSheetsImportProps> = ({ onImport }) => {
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const [gsUrl, setGsUrl] = useState("");
  const [editable, setEditable] = useState<MenuItem[] | null>(null);
  const toast = React.useContext(ToastContainerContext);
  const { withLoading, isLoading } = useLoading();

  const handleImportJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await withLoading(async () => {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          setEditable(assignUniqueIds(data));
          toast?.notify("JSON успешно загружен", "success", 2000);
        } else {
          toast?.notify("Некорректный формат JSON: ожидается массив", "error", 3500);
        }
      } catch (e) {
        toast?.notify("Не удалось прочитать JSON-файл: " + (e instanceof Error ? e.message : String(e)), "error", 3500);
      }
    });
  };

  const handleFetchGoogleSheet = async () => {
    await withLoading(async () => {
      try {
        let url = gsUrl.trim();
        const converted = googleSheetsUrlToCsv(url);
        if (converted) url = converted;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error("Ошибка загрузки: " + resp.status);
        const text = await resp.text();
        const tree = parseCsvToMenu(text);
        setEditable(assignUniqueIds(tree));
        toast?.notify("Данные загружены", "success", 2000);
      } catch (e) {
        toast?.notify("Не удалось загрузить Google Sheets/CSV", "error", 3500);
        setEditable(null);
      }
    });
  };

  const handleImportCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await withLoading(async () => {
      try {
        const text = await file.text();
        const tree = parseCsvToMenu(text);
        setEditable(assignUniqueIds(tree));
        toast?.notify("CSV успешно загружен", "success", 2000);
      } catch (e) {
        toast?.notify("Не удалось прочитать CSV-файл", "error", 3500);
        setEditable(null);
      }
    });
  };

  const handleImport = () => {
    if (!editable) return;
    const now = new Date();
    const name = `Импортированное меню ${now.toLocaleDateString()} ${now.toLocaleTimeString().slice(0, 5)}`;
    onImport(editable, name);
  };

  return (
    <div className={styles.container}>
      <div className={styles.subtitle}>Импорт меню из Google Sheets, CSV и JSON</div>
      <div className={styles.inputContainer}>
        <div className={styles.importGrid}>
          {/* JSON */}
          <div className={styles.importCard}>
            <img src={menuPreviewSvg} alt="Пример структуры меню" />
            <div className={styles.importCardTitle}>Импорт из JSON</div>
            <div className={styles.importCardDesc}>Загрузите JSON с массивом элементов меню. Идентификаторы будут сгенерированы автоматически.</div>
            <a href="/menu-example.json" download>Скачать пример JSON</a>
            <button type="button" className={styles.importCardBtn} onClick={() => jsonFileInputRef.current?.click()} disabled={isLoading}>Выбрать JSON</button>
            <input ref={jsonFileInputRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={handleImportJsonFile} />
          </div>
          {/* CSV */}
          <div className={styles.importCard}>
            <img src={csvPreviewSvg} alt="Пример CSV" />
            <div className={styles.importCardTitle}>Импорт из CSV</div>
            <div className={styles.importCardDesc}>Поддерживаются колонки text, uri, SVG и др. Для вложенности используйте text2, uri2 и т. д.</div>
            <a href="/csv-example.csv" download>Скачать пример CSV</a>
            <button type="button" className={styles.importCardBtn} onClick={() => csvFileInputRef.current?.click()}>Выбрать файл (.csv)</button>
            <input ref={csvFileInputRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={handleImportCsvFile} />
          </div>
          {/* Google Sheets */}
          <div className={styles.importCard}>
            <img src={googleSheetsPreviewSvg} alt="Импорт из Google Sheets" />
            <div className={styles.importCardTitle}>Импорт из Google Sheets</div>
            <div className={styles.importCardDesc}>Вставьте публичную ссылку Google Sheets. Ссылка будет автоматически конвертирована в CSV.</div>
            <input type="text" value={gsUrl} onChange={(e) => setGsUrl(e.target.value)} placeholder="Ссылка на Google Sheets (или CSV)" className={styles.importCardInput} />
            <div className={styles.hint}>Можно вставить публичную ссылку Google Sheets — документ будет автоматически преобразован в CSV.</div>
            <button onClick={handleFetchGoogleSheet} className={styles.importCardBtn} disabled={isLoading}>{isLoading ? "Загружается..." : "Загрузить"}</button>
          </div>
        </div>
      </div>

      {editable && (
        <div className={styles.marginTop16}>
          <div className={styles.fontWeight600}>Предпросмотр меню:</div>
          <ul>
            {editable.map((i) => (
              <li key={i.id}>{i.text || i.uri}</li>
            ))}
          </ul>
          <button onClick={handleImport} className={styles.importCardBtn} style={{ width: 240 }}>Импортировать в проект</button>
        </div>
      )}
    </div>
  );
};

export default GoogleSheetsImport;
