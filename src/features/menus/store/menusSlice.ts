import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../../shared/api/client";
import type { ApiError } from "../../../shared/api/client";

export interface SavedMenu { id: string; name: string; items: any[] }

type RequestStatus = "idle" | "loading" | "succeeded" | "failed";

interface MenusState {
  items: SavedMenu[];
  status: RequestStatus;
  error?: string | null;
}

const initialState: MenusState = {
  items: [],
  status: "idle",
  error: null,
};

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "string") return error;
  const err = error as ApiError;
  if (err?.message) return err.message;
  return fallback;
}

export const fetchMenus = createAsyncThunk<SavedMenu[], void, { rejectValue: string }>(
  "menus/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const data = await api.get<SavedMenu[]>("/api/menus");
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Не удалось получить список меню"));
    }
  }
);

export const createMenu = createAsyncThunk<SavedMenu, string, { rejectValue: string }>(
  "menus/create",
  async (name, { rejectWithValue }) => {
    const menuName = name.trim() || "Новое меню";
    try {
      const created = await api.post<SavedMenu>("/api/menus", { name: menuName });
      return created;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Не удалось создать меню"));
    }
  }
);

export const deleteMenu = createAsyncThunk<string, string, { rejectValue: string }>(
  "menus/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.del(`/api/menus/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Не удалось удалить меню"));
    }
  }
);

const menusSlice = createSlice({
  name: "menus",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMenus.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchMenus.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchMenus.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Не удалось получить список меню";
      })
      .addCase(createMenu.fulfilled, (state, action) => {
        state.items.push(action.payload);
        state.error = null;
      })
      .addCase(createMenu.rejected, (state, action) => {
        state.error = action.payload ?? "Не удалось создать меню";
      })
      .addCase(deleteMenu.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
        state.error = null;
      })
      .addCase(deleteMenu.rejected, (state, action) => {
        state.error = action.payload ?? "Не удалось удалить меню";
      });
  },
});

export default menusSlice.reducer;
