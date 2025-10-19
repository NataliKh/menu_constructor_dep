import React from "react";
import { Link } from "react-router-dom";

const ForbiddenPage: React.FC = () => {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ margin: 0, fontSize: 28 }}>Доступ запрещён</h1>
      <p style={{ margin: "12px 0 20px" }}>У вас нет прав для просмотра этой страницы.</p>
      <div style={{ display: "flex", gap: 12 }}>
        <Link to="/menus">На главную</Link>
        <Link to="/login">Войти</Link>
      </div>
    </div>
  );
};

export default ForbiddenPage;
