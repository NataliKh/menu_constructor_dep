import React from "react";
import { Link } from "react-router-dom";
import { Button, Input, Section, SectionTitle } from "../../shared/ui/base";
import styles from "./AuthReset.module.css";
import { api } from "../../shared/api/client";
import { ToastContainerContext } from "../../shared/ui/ToastContainer";

const ForgotPasswordPage: React.FC = () => {
  const [username, setUsername] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const toast = React.useContext(ToastContainerContext);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await api.post<{ message?: string }>(`/api/auth/forgot`, { username: username.trim() });
      toast?.notify(res?.message || "Письмо отправлено", "success", 2500);
    } catch (err) {
      const msg = (err as Error)?.message || "Не удалось отправить ссылку";
      setError(msg);
      toast?.notify(msg, "error", 3500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Section className={styles._container}>
      <SectionTitle level={1}>Восстановление пароля</SectionTitle>
      <p className={styles._hint}>Укажите логин (email), мы отправим ссылку для сброса пароля на почту.</p>
      <form onSubmit={handleSubmit} className={styles._form}>
        <div>
          <span className={styles._label}>Логин</span>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Логин" disabled={isSubmitting} />
        </div>
        {error && <div className={styles._error}>{error}</div>}
        <div className={styles._row}>
          <Button type="submit" disabled={isSubmitting}>Получить ссылку</Button>
          <Link className={styles._link} to="/login">Вернуться ко входу</Link>
        </div>
      </form>
    </Section>
  );
};

export default ForgotPasswordPage;
