import React from "react";
import styles from "./Section.module.css";

interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {
  stack?: boolean;
}

export const Section: React.FC<SectionProps> = ({ className, children, stack = true, ...rest }) => {
  return (
    <div className={[styles._section, stack ? styles._stack : "", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </div>
  );
};

