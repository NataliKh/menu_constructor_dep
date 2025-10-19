import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../shared/auth/AuthProvider";
import { Button, Input, Section, SectionTitle } from "../../shared/ui/base";
import styles from "./Login.module.css";
import { ToastContainerContext } from "../../shared/ui/ToastContainer";

const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [mode, setMode] = React.useState<"login" | "register">("login");
  const toast = React.useContext(ToastContainerContext);
  const [errors, setErrors] = React.useState<{ username?: string; password?: string; common?: string }>({});

  const from = location.state?.from?.pathname || "/menus";

  return (
    <Section className={styles._container}>
      <SectionTitle level={1}>{mode === "login" ? "Вход" : "Регистрация"}</SectionTitle>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setErrors({});
          try {
            if (mode === "login") {
              await login(username, password);
              toast?.notify("Успешный вход", "success", 2000);
            } else {
              await register(username, password);
              toast?.notify("Аккаунт создан и вход выполнен", "success", 2000);
            }
            navigate(from, { replace: true });
          } catch (err) {
            // ошибки приходят через message и fieldErrors из запроса
            const anyErr = err as any;
            const msg = anyErr?.message || (err instanceof Error ? err.message : String(err));
            const fieldErrors = anyErr?.fieldErrors as { username?: string; password?: string } | undefined;
            if (fieldErrors) setErrors({ ...fieldErrors, common: msg });
            else setErrors({ common: msg });
            toast?.notify(msg, "error", 3500);
          }
        }}
        className={styles._form}
      >
        <div>
          <span className={styles._label}>Логин</span>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Логин" aria-invalid={Boolean(errors.username)} />
          {errors.username && <div className={styles._error}>{errors.username}</div>}
        </div>
        <div>
          <span className={styles._label}>Пароль</span>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" aria-invalid={Boolean(errors.password)} />
          {errors.password && <div className={styles._error}>{errors.password}</div>}
        </div>
        {errors.common && <div className={styles._common}>{errors.common}</div>}
        <div className={styles._row}>
          <Button type="submit">{mode === "login" ? "Войти" : "Зарегистрироваться"}</Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Регистрация" : "У меня есть аккаунт"}
          </Button>
        </div>
      </form>
    </Section>
  );
};

export default LoginPage;
