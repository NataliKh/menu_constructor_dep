import React from "react";
import styles from "./Toolbar.module.css";

interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  between?: boolean;
  wrap?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({ className, between, wrap, children, ...rest }) => {
  const cls = [styles._bar, between ? styles._between : "", wrap ? styles._wrap : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
};

