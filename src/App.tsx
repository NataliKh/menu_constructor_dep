import React from "react";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import "./App.css";
import { ToastContainer } from "./shared/ui/ToastContainer";
import { LoadingProvider } from "./shared/loading/LoadingProvider";
import { Loader } from "./shared/ui/Loader";
import MenusListPage from "./pages/menus";
import MenuLayout from "./pages/menus/layout";
import MenuEditPage from "./pages/menus/edit";
import MenuExportPage from "./pages/menus/export";
import MenuPreviewPage from "./pages/menus/preview";
import ImportPage from "./pages/import";
import TemplatesPage from "./pages/templates";
import { AuthProvider, useAuth } from "./shared/auth/AuthProvider";
import RequireAuth from "./shared/auth/RequireAuth";
import LoginPage from "./pages/login";
import ForbiddenPage from "./pages/forbidden";
import navStyles from "./AppNav.module.css";

const App: React.FC = () => {
  return (
    <ToastContainer>
      <LoadingProvider>
        <AuthProvider>
          <Loader />
          <BrowserRouter>
            <TopNav />
            <Routes>
              <Route element={<RequireAuth />}>
                <Route path="/" element={<MenusListPage />} />
                <Route path="/menus" element={<MenusListPage />} />
                <Route path="/menus/:id" element={<MenuLayout />}>
                  <Route index element={<MenuEditPage />} />
                  <Route path="edit" element={<MenuEditPage />} />
                  <Route path="export" element={<MenuExportPage />} />
                  <Route path="preview" element={<MenuPreviewPage />} />
                </Route>
                <Route path="/templates" element={<TemplatesPage />} />
              </Route>
              <Route path="/import" element={<ImportPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forbidden" element={<ForbiddenPage />} />
              <Route path="*" element={<Navigate to="/menus" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LoadingProvider>
    </ToastContainer>
  );
};

const TopNav: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className={navStyles._nav}>
      <Link to="/menus" className={navStyles._logo} aria-label="Перейти к списку меню">
        <img src="/logoheader.svg" alt="Menu Constructor logo" />
      </Link>
      {isAuthenticated && (
        <>
          <Link to="/menus" className={navStyles._link}>Меню</Link>
          <Link to="/import" className={navStyles._link}>Импорт</Link>
          <Link to="/templates" className={navStyles._link}>Шаблоны</Link>
        </>
      )}
      <div className={navStyles._spacer}>
        {isAuthenticated ? (
          <>
            <span style={{ fontSize: 13, color: "#666" }}>{user?.username} ({user?.role})</span>
            <button onClick={logout} className={navStyles._logoutBtn}>Выйти</button>
          </>
        ) : (
          <Link to="/login" className={navStyles._link}>Войти</Link>
        )}
      </div>
    </div>
  );
};
export default App;



