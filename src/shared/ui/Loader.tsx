import React from "react";
import { useLoading } from "../loading/LoadingProvider";
import styles from "./Loader.module.css";

export const Loader: React.FC = () => {
  const { isLoading } = useLoading();
  if (!isLoading) return null;
  return (
    <div className={styles._overlay} aria-live="polite" aria-busy>
      <div className={styles._spinner} role="status" aria-label="Загрузка" />
    </div>
  );
};

