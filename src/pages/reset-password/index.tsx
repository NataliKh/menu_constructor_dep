import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Input, Section, SectionTitle } from "../../shared/ui/base";
import styles from "../forgot-password/AuthReset.module.css";
import { api } from "../../shared/api/client";
import { ToastContainerContext } from "../../shared/ui/ToastContainer";

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [token, setToken] = React.useState(searchParams.get("token") || "");
  const [username, setUsername] = React.useState(searchParams.get("username") || "");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const toast = React.useContext(ToastContainerContext);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!token.trim()) {
      const msg = "Token is missing, request password reset again.";
      setError(msg);
      toast?.notify(msg, "error", 3000);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.post<{ message?: string }>("/api/auth/reset", { token: token.trim(), password });
      toast?.notify(res?.message || "Пароль успешно обновлен", "success", 2500);
      navigate("/login");
    } catch (err) {
      const msg = (err as Error)?.message || "Ошибка при сбросе пароля";
      setError(msg);
      toast?.notify(msg, "error", 3500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Section className={styles._container}>
      <SectionTitle level={1}>Сброс пароля</SectionTitle>
      <form onSubmit={handleSubmit} className={styles._form}>
        {/* token kept hidden to avoid manual edits */}
        <input type="hidden" value={token} onChange={(e) => setToken(e.target.value)} />
        <div>
          <span className={styles._label}>Логин / email</span>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Укажите логин или email"
            disabled={isSubmitting}
          />
        </div>
        <div>
          <span className={styles._label}>Новый пароль</span>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Минимум 6 символов"
            disabled={isSubmitting}
          />
        </div>
        {error && <div className={styles._error}>{error}</div>}
        <div className={styles._row}>
          <Button type="submit" disabled={isSubmitting}>
            Обновить пароль
          </Button>
          <Link className={styles._link} to="/forgot-password">
            Запросить заново
          </Link>
        </div>
      </form>
    </Section>
  );
};

export default ResetPasswordPage;
