import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Input, Section, SectionTitle } from "../../shared/ui/base";
import styles from "../forgot-password/AuthReset.module.css";
import { api } from "../../shared/api/client";
import { ToastContainerContext } from "../../shared/ui/ToastContainer";

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [token, setToken] = React.useState(searchParams.get("token") || "");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const toast = React.useContext(ToastContainerContext);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await api.post<{ message?: string }>(`/api/auth/reset`, { token: token.trim(), password });
      toast?.notify(res?.message || "Пароль обновлен", "success", 2500);
      navigate("/login");
    } catch (err) {
      const msg = (err as Error)?.message || "Не удалось обновить пароль";
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
        <div>
          <span className={styles._label}>Токен</span>
          <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Токен из письма" disabled={isSubmitting} />
        </div>
        <div>
          <span className={styles._label}>Новый пароль</span>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Минимум 6 символов" disabled={isSubmitting} />
        </div>
        {error && <div className={styles._error}>{error}</div>}
        <div className={styles._row}>
          <Button type="submit" disabled={isSubmitting}>Обновить пароль</Button>
          <Link className={styles._link} to="/forgot-password">Запросить токен</Link>
        </div>
      </form>
    </Section>
  );
};

export default ResetPasswordPage;
