import { configureStore } from "@reduxjs/toolkit";
import menusReducer from "../features/menus/store/menusSlice";
import templatesReducer from "../features/templates/store/templatesSlice";

export const store = configureStore({
  reducer: {
    menus: menusReducer,
    templates: templatesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
