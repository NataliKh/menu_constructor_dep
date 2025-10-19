import React from "react";
import styles from "./SectionTitle.module.css";

interface SectionTitleProps {
  level?: 1 | 2;
  children: React.ReactNode;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ level = 1, children }) => {
  const className = [styles._title, level === 1 ? styles._h1 : styles._h2].join(" ");
  if (level === 1) return <h1 className={className}>{children}</h1>;
  return <h2 className={className}>{children}</h2>;
};

