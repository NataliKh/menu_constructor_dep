import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../../shared/api/client";
import type { ApiError } from "../../../shared/api/client";

export type Template = { name: string; value: string };

type RequestStatus = "idle" | "loading" | "succeeded" | "failed";

export const DEFAULT_TEMPLATE = `<li class=\"<?= htmlspecialchars($item['className'] ?? '') ?>\">
  <a href=\"<?= htmlspecialchars($item['uri'] ?? '#') ?>\">
    <?= htmlspecialchars($item['text'] ?? '') ?>
  </a>
  <?php if (!empty($item['children'])): ?>
    <ul>
      <?= renderMenu($item['children']); ?>
    </ul>
  <?php endif; ?>
</li>`;

interface TemplatesState {
  items: Template[];
  status: RequestStatus;
  error?: string | null;
  hasLocalChanges: boolean;
  syncDisabled: boolean;
}

const initialState: TemplatesState = {
  items: [{ name: "default", value: DEFAULT_TEMPLATE }],
  status: "idle",
  error: null,
  hasLocalChanges: false,
  syncDisabled: false,
};

export function normalizeTemplates(list: Template[]): Template[] {
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

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "string") return error;
  const err = error as ApiError;
  if (err?.message) return err.message;
  return fallback;
}

function payloadMessage(payload: ApiError | string | undefined, fallback: string) {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;
  return getErrorMessage(payload, fallback);
}

export const fetchTemplates = createAsyncThunk<Template[], void, { rejectValue: ApiError | string }>(
  "templates/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const data = await api.get<Template[]>("/api/templates");
      return normalizeTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      const err = error as ApiError;
      return rejectWithValue(err?.status ? err : getErrorMessage(error, "Не удалось загрузить шаблоны"));
    }
  }
);

export const uploadTemplates = createAsyncThunk<Template[], Template[], { rejectValue: ApiError | string }>(
  "templates/uploadAll",
  async (payload, { rejectWithValue }) => {
    try {
      const normalized = normalizeTemplates(payload);
      await api.post("/api/templates/bulk", { templates: normalized });
      return normalized;
    } catch (error) {
      const err = error as ApiError;
      return rejectWithValue(err?.status ? err : getErrorMessage(error, "Не удалось синхронизировать шаблоны"));
    }
  }
);

export const deleteTemplateRemote = createAsyncThunk<string, string, { rejectValue: ApiError | string }>(
  "templates/delete",
  async (name, { rejectWithValue }) => {
    try {
      await api.del(`/api/templates/${encodeURIComponent(name)}`);
      return name;
    } catch (error) {
      const err = error as ApiError;
      return rejectWithValue(err?.status ? err : getErrorMessage(error, "Не удалось удалить шаблон"));
    }
  }
);

const templatesSlice = createSlice({
  name: "templates",
  initialState,
  reducers: {
    setTemplateValue: (state, action: PayloadAction<{ name: string; value: string }>) => {
      const { name, value } = action.payload;
      const trimmed = name.trim();
      if (!trimmed) return;
      const nextList = state.items.map((tpl) => (tpl.name === trimmed ? { ...tpl, value } : tpl));
      state.items = normalizeTemplates(nextList);
      state.hasLocalChanges = true;
    },
    upsertTemplate: (state, action: PayloadAction<Template>) => {
      const name = action.payload.name.trim();
      if (!name) return;
      const nextList = [...state.items];
      const idx = nextList.findIndex((tpl) => tpl.name === name);
      if (idx === -1) {
        nextList.push({ name, value: action.payload.value });
      } else {
        nextList[idx] = { name, value: action.payload.value };
      }
      state.items = normalizeTemplates(nextList);
      state.hasLocalChanges = true;
    },
    renameTemplateLocal: (state, action: PayloadAction<{ from: string; to: string }>) => {
      const from = action.payload.from.trim();
      const to = action.payload.to.trim();
      if (!from || !to) return;
      state.items = normalizeTemplates(
        state.items.map((tpl) => (tpl.name === from ? { ...tpl, name: to } : tpl))
      );
      state.hasLocalChanges = true;
    },
    deleteTemplateLocal: (state, action: PayloadAction<string>) => {
      const name = action.payload.trim();
      if (!name) return;
      state.items = normalizeTemplates(state.items.filter((tpl) => tpl.name !== name));
      state.hasLocalChanges = true;
    },
    markSynced: (state) => {
      state.hasLocalChanges = false;
    },
    setSyncDisabled: (state, action: PayloadAction<boolean>) => {
      state.syncDisabled = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTemplates.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchTemplates.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
        state.hasLocalChanges = false;
        state.syncDisabled = false;
      })
      .addCase(fetchTemplates.rejected, (state, action) => {
        state.status = "failed";
        state.error = payloadMessage(action.payload, "Не удалось загрузить шаблоны");
      })
      .addCase(uploadTemplates.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(uploadTemplates.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
        state.hasLocalChanges = false;
      })
      .addCase(uploadTemplates.rejected, (state, action) => {
        state.status = "failed";
        state.error = payloadMessage(action.payload, "Не удалось синхронизировать шаблоны");
      })
      .addCase(deleteTemplateRemote.fulfilled, (state, action) => {
        state.items = normalizeTemplates(state.items.filter((tpl) => tpl.name !== action.payload));
        state.hasLocalChanges = false;
      })
      .addCase(deleteTemplateRemote.rejected, (state, action) => {
        state.error = payloadMessage(action.payload, "Не удалось удалить шаблон");
      });
  },
});

export const {
  setTemplateValue,
  upsertTemplate,
  renameTemplateLocal,
  deleteTemplateLocal,
  markSynced,
  setSyncDisabled,
} = templatesSlice.actions;

export default templatesSlice.reducer;
